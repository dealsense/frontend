import sys
import os
import io
import torch
import tempfile
from PIL import Image
import configparser
from numba import cuda
from pathlib import Path

# -----------------------------------------------------------------------------
# Set up repo base path and config
# -----------------------------------------------------------------------------
base = Path(__file__).parent
sys.path.insert(0, str(base))

from frontend.utils.utils import encode_image
from bx.ai.data_ingestion import AzureOCRReader, File, FileType
from aws_utils.aws_services import S3DataManager
from doclayout_yolo import YOLOv10

config = configparser.ConfigParser()
config.read(os.path.join(base, "config.ini"))



# -----------------------------------------------------------------------------
# Main class
# -----------------------------------------------------------------------------
class UseModelClass:
    """
    Interact with text LLMs, vision-LLMs, Azure OCR, embeddings, and a YOLOv10
    document-layout detector. Defaults are read from config.ini
    """

    def __init__(self, client=None):
        self.client = client
        self.max_new_tokens = int(config["other parameters"].get("max_new_tokens"))
        self.max_length = int(config["other parameters"].get("max_length"))
        self.temperature = float(config["other parameters"].get("temperature"))
        self.max_tokens = int(config["other parameters"].get("max_tokens"))

    # -------------------------------------------------------------------------
    # Text → Text
    # -------------------------------------------------------------------------
    def use_text_to_text_model(self, model_name: str, prompt: str, **kwargs) -> str:
        self.max_new_tokens = kwargs.get("max_new_tokens", self.max_new_tokens)
        self.max_length = kwargs.get("max_length", self.max_length)
        self.temperature = kwargs.get("temperature", self.temperature)
        self.max_tokens = kwargs.get("max_tokens", self.max_tokens)

        messages = [{"role": "user", "content": prompt}]

        resp = self.client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=temperature,
        )
        return resp.completion
        
    # -------------------------------------------------------------------------
    # Text+Image → Text
    # -------------------------------------------------------------------------
    def use_textimg_to_text_model(
        self,
        model_name: str,
        prompt: str,
        image_path,
        base64_flag: bool = False,
        **kwargs,
    ) -> str:
        self.OCRmax_new_tokens = kwargs.get("max_new_tokens", self.max_new_tokens)
        self.OCRmax_length = kwargs.get("max_length", self.max_length)
        self.OCRtemperature = kwargs.get("temperature", self.temperature)
        self.OCRmax_tokens = kwargs.get("max_tokens", self.max_tokens)

        content = [{"type": "text", "text": prompt}]

        if isinstance(image_path, str):
            image_path = [image_path]

        for image in image_path:
            if not base64_flag and isinstance(image, str) and os.path.exists(image):
                img_b64 = encode_image(image)
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"},
                        "detail": "high",
                    }
                )
            else:
                content.append({"type": "image_url", "image_url": {"url": image}})

        try:
            if model_name.startswith('gpt'):
                resp = self.client.chat.completions.create(
                    model=model_name,
                    messages=content,
                    temperature=temperature
                )
            else:
                resp = self.client.chat_completion.create(
                    model=model_name,
                    messages=content,
                )
            return resp.completion
        except Exception as e:
            return f"Error responding and having error [{str(e)[-10:]}]"

    # -------------------------------------------------------------------------
    # OCR (lite endpoint calling self.client.ocr.create)
    # -------------------------------------------------------------------------
    def OCR_lite(self, file_path: str) -> str:
        pdf_stream = S3DataManager.read_pdf_from_s3_as_stream(file_path)
        resp = self.client.ocr.create(
            file_name=os.path.basename(file_path),
            file_bytes=pdf_stream,
            api_version="v2",
        )
        return resp.get("data", {}).get("content")

    # -------------------------------------------------------------------------
    # OCR via Azure Document Intelligence reader
    # -------------------------------------------------------------------------
    def OCR(self, file_path: str, file_type=FileType.BYTES):
        reader = AzureOCRReader(client=self.client)
        pdf_stream = S3DataManager.read_pdf_from_s3_as_stream(file_path)

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_stream.read())
            tmp_path = tmp.name

        file = File(uri=tmp_path, file_type=file_type)
        documents = reader.load_data(file)
        # Cleanup: Delete the temporary file
        os.remove(tmp_path)

        return documents

    # -------------------------------------------------------------------------
    # Embeddings
    # -------------------------------------------------------------------------
    def create_embeddings(self, text_list, embed_model=config["models"]["embedding_model"]):
        return self.client.embeddings.create(text_list, model=embed_model)

    # -------------------------------------------------------------------------
    # YOLOv10 Doc Layout Detection
    # -------------------------------------------------------------------------
    def load_image_detect_from_hf(self, model_path: str = None):
        model_path = model_path or base / config["models"].get("doclayout", None)

        device = "cuda" if torch.cuda.is_available() else "cpu"

        if YOLOv10 is None:
            raise RuntimeError("doclayout_yolo.YOLOv10 not available")

        model = YOLOv10(model_path, verbose=False)
        model.to(device)

        return {
            "model": model,
            "tokenizer": "",
            "model_name": model_path,
            "inference_type": "doc_layout",
        }

    def use_image_detection_model(self, model_obj, image_path: str, imgsz: int = 1024, conf: float = 0.2):
        device = (
            "cuda"
            if torch.cuda.is_available()
            else ("mps" if hasattr(torch.backends, "mps") and torch.backends.mps.is_available() else "cpu")
        )


        # Load image bytes from S3 and keep in-memory as BytesIO
        img_bytes = S3DataManager.download_image_from_s3_to_memory(image_path)

        model = model_obj["model"]
        
        det_res = model.predict(
            img_bytes,
            imgsz=imgsz,
            conf=conf,
            device=device,
            verbose=False,
        )

        del img_bytes  # encourage early cleanup
        return det_res

    def doclayout_detect_layout(self, detection_model, image_path: str):
        det_res = self.use_image_detection_model(detection_model, image_path)
        boxes = det_res[0].boxes.xyxy
        classes = det_res[0].boxes.cls
        confidences = det_res[0].boxes.conf
        labels = det_res[0].names

        results = [
            {"bbox": bbox.tolist(), "label": labels[int(cls_id)], "confidence": float(conf)}
            for bbox, cls_id, conf in zip(boxes, classes, confidences)
        ]
        return results

    # -------------------------------------------------------------------------
    # Azure layout detection (PDF) via self.client.ocr.create
    # -------------------------------------------------------------------------
    def azure_detect_layout(self, file_path: str):
       
        pdf_stream = S3DataManager.read_pdf_from_s3_as_stream(file_path)

        response = self.client.ocr.create(
            file_name=os.path.basename(file_path),
            file_bytes=pdf_stream,
            api_version="v2",
        )

        data = response.get("data", {})
        content = data.get("content")
        tables = data.get("tables", [])
        figures = data.get("figures", []) 

        results = []

        # Normalize tables
        for table_idx,table in enumerate(tables):
            row_count = int(table.get("rowCount", 0))
            col_count = int(table.get("columnCount", 0))
            page_number = int(table.get("boundingRegions", [{}])[0].get("pageNumber", 1)) - 1
            
            cells =  table.get("cells", [])
            if not cells:
                continue
            
            f_polygon = cells[0].get("boundingRegions", [{}])[0].get("polygon", [])
            l_polygon = cells[-1].get("boundingRegions", [{}])[0].get("polygon", [])
            
            final_poly = [
                f_polygon[0], f_polygon[1], l_polygon[4], f_polygon[1],
                l_polygon[4], l_polygon[5], f_polygon[0], l_polygon[5]
            ]
            
            if not final_poly or len(final_poly) < 8:
                continue
            
            points = [(final_poly[i] *72, final_poly[i+1] *72) for i in range(0, len(final_poly), 2)]
            
            bbox = [points[0][0], points[0][1], points[2][0], points[2][1]]
            table_meta = {
                "label": "table",
                "page": page_number,
                "row_count": row_count,
                "col_count": col_count,
                "bbox": bbox,
                'polygon': points,
            }
            results.append(table_meta)
            

        # Normalize figures
        for fig_idx,figure in enumerate(figures):
            regions = figure.get("boundingRegions", [])
            for region in regions:
                page_number = int(region.get("pageNumber", 1)) - 1
                polygon = region.get("polygon", [])
            if not polygon or len(polygon) < 8:
                continue
            
            points = [(polygon[i] *72, polygon[i+1] *72) for i in range(0, len(polygon), 2)]
            bbox = [points[0][0], points[0][1], points[2][0], points[2][1]]
            img_meta = {
                "label": "figure",
                "page": page_number,
                "bbox": bbox,
                'polygon': points,
            }
            
            results.append(img_meta)

        return results
