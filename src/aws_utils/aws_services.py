import os
import io
import json
from PIL import Image
import numpy as np
from dotenv import load_dotenv
from typing import Optional
from google.cloud import storage, secretmanager, firestore, pubsub_v1
import pandas as pd
from fastapi import HTTPException, status
from pathlib import Path
from loguru import logger

logger.remove()
base = Path(__file__).parent[1]

load_dotenv(base / "models/client.env")

# ------------- GCS data helpers -------------

class GCSDataManager:
    def __init__(self):
        pass

    # ---------- Uploads ----------

    @staticmethod
    def upload_dict_as_json_to_gcs(my_dict: dict, blob_path: str) -> None:
        json_str = json.dumps(my_dict, ensure_ascii=False)
        stream = io.BytesIO(json_str.encode("utf-8"))
        GcpUtilityService.upload_gcs_blob_stream(stream, blob_path)

    @staticmethod
    def upload_str_as_txt_to_gcs(text: str, blob_path: str) -> None:
        stream = io.BytesIO(text.encode("utf-8"))
        GcpUtilityService.upload_gcs_blob_stream(stream, blob_path)

    @staticmethod
    def upload_df_as_csv_to_gcs(df: pd.DataFrame, blob_path: str) -> None:
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        GcpUtilityService.upload_gcs_blob_stream(io.BytesIO(stream.getvalue().encode("utf-8")), blob_path)

    @staticmethod
    def upload_csv_to_gcs(csv_stream, blob_path: str) -> None:
        GcpUtilityService.upload_gcs_blob_data(csv_stream.getvalue().encode("utf-8"), blob_path)

    # ---------- Reads ----------

    @staticmethod
    def read_json_from_gcs_as_dict(blob_path: str) -> Optional[dict]:
        if GcpUtilityService.gcs_blob_exists(blob_path):
            data = GcpUtilityService.download_gcs_blob_data(blob_path)
            return json.loads(data.decode("utf-8"))
        return {}

    @staticmethod
    def read_txt_from_gcs_as_text(blob_path: str) -> str:
        data = GcpUtilityService.download_gcs_blob_data(blob_path)
        return data.decode("utf-8")

    @staticmethod
    def read_csv_from_gcs_as_dataframe(blob_path: str) -> pd.DataFrame:
        data = GcpUtilityService.download_gcs_blob_data(blob_path)
        return pd.read_csv(io.BytesIO(data))

    @staticmethod
    def read_excel_from_gcs_as_dataframe(blob_path: str, sheet_name: str) -> pd.DataFrame:
        data = GcpUtilityService.download_gcs_blob_data(blob_path)
        return pd.read_excel(io.BytesIO(data), sheet_name=sheet_name)

    @staticmethod
    def read_pdf_from_gcs_as_stream(blob_path: str) -> io.BytesIO:
        data = GcpUtilityService.download_gcs_blob_data(blob_path)
        return io.BytesIO(data)

    @staticmethod
    def download_image_from_gcs_to_memory(blob_path: str) -> bytes:
        image_data = GcpUtilityService.download_gcs_blob_data(blob_path)
        image_stream = io.BytesIO(image_data)
        image_stream.seek(0)
        pil_img = Image.open(image_stream).convert("RGB")
        img = np.array(pil_img)
        pil_img.close()
        return img

    # ---------- Bulk ----------

    @staticmethod
    def upload_folder_to_gcs(local_folder_path: str, gcs_folder_prefix: str) -> None:
        for root, dirs, files in os.walk(local_folder_path):
            for file in files:
                local_path = os.path.join(root, file)
                relative_path = os.path.relpath(local_path, local_folder_path)
                gcs_key = os.path.join(gcs_folder_prefix, relative_path).replace("\\", "/")
                if local_path.endswith(".md") or ".gitkeep" in local_path:
                    continue
                with open(local_path, "rb") as f:
                    GcpUtilityService.upload_gcs_blob_data(f.read(), gcs_key)

    @staticmethod
    def upload_dfs_as_excel_to_gcs(dfs: dict, blob_path: str) -> None:
        excel_stream = io.BytesIO()
        with pd.ExcelWriter(excel_stream, engine="xlsxwriter") as writer:
            for sheet_name, df in dfs.items():
                valid_sheet = sheet_name[:31]
                df.to_excel(writer, sheet_name=valid_sheet, index=False)
        excel_stream.seek(0)
        GcpUtilityService.upload_gcs_blob_stream(excel_stream, blob_path)

    @staticmethod
    def list_folders_in_gcs(prefix):
        client = storage.Client(project= project_id)
        bucket = client.bucket(GcpUtilityService.bucket_name)
        if not prefix.endswith("/"):
            prefix += "/"
        blobs = client.list_blobs(bucket, prefix=prefix, delimiter="/")
        return [p[len(prefix):].rstrip("/") for p in blobs.prefixes]


class GcpUtilityService:
    bucket_name = os.getenv("GCS_BUCKET_NAME")
    project_id = os.getenv("GCP_PROJECT_ID")

    # ---- Secrets ----
    @staticmethod
    def get_secret_value(name: str):
        client = secretmanager.SecretManagerServiceClient()
        
        secret_path = f"projects/{project_id}/secrets/{name}/versions/latest"
        try:
            response = client.access_secret_version(request={"name": secret_path})
            return response.payload.data.decode("UTF-8")
        except Exception as e:
            raise HTTPException(
                status_code=getattr(status, "HTTP_500_INTERNAL_SERVER_ERROR", 500),
                detail=f"Error retrieving secret {name}: {e}",
            )

    # ---- GCS put/get helpers ----
    @staticmethod
    def upload_gcs_blob_stream(stream: io.BytesIO, blob_path: str, bucket_name=bucket_name) -> None:
        with logger.contextualize(gcs_bucket=bucket_name, blob_path=blob_path):
            logger.info("Uploading to GCS")
            client = storage.Client(project= project_id)
            bucket = client.bucket(bucket_name or GcpUtilityService.bucket_name)
            blob = bucket.blob(blob_path)
            stream.seek(0)
            blob.upload_from_file(stream, rewind=True)

    @staticmethod
    def upload_gcs_blob_data(data: bytes, blob_path: str, bucket_name=bucket_name) -> None:
        with logger.contextualize(gcs_bucket=bucket_name, blob_path=blob_path):
            logger.info("Uploading to GCS")
            client = storage.Client(project= project_id)
            bucket = client.bucket(bucket_name or GcpUtilityService.bucket_name)
            blob = bucket.blob(blob_path)
            blob.upload_from_string(data)

    @staticmethod
    def download_gcs_blob_data(blob_path: str, bucket_name=bucket_name):
        with logger.contextualize(gcs_bucket=bucket_name, blob_path=blob_path):
            logger.info("Downloading from GCS")
            client = storage.Client(project= project_id)
            bucket = client.bucket(bucket_name or GcpUtilityService.bucket_name)
            blob = bucket.blob(blob_path)
            return blob.download_as_bytes()

    @staticmethod
    def get_gcs_blob_size(blob_path: str, bucket_name=bucket_name):
        with logger.contextualize(gcs_bucket=bucket_name, blob_path=blob_path):
            logger.info("Getting GCS blob size")
            client = storage.Client(project= project_id)
            bucket = client.bucket(bucket_name or GcpUtilityService.bucket_name)
            blob = bucket.get_blob(blob_path)
            return blob.size / 1000 if blob else 0

    # ---- Pre-signed URLs ----
    @staticmethod
    def get_presigned_url(blob_path: str, bucket_name=bucket_name, expiration=600):
        with logger.contextualize(gcs_bucket=bucket_name, blob_path=blob_path):
            logger.info("Generating signed URL")
            client = storage.Client(project= project_id)
            bucket = client.bucket(bucket_name or GcpUtilityService.bucket_name)
            blob = bucket.blob(blob_path)
            url = blob.generate_signed_url(expiration=expiration)
            return url

    # ---- Existence / deletion ----
    @staticmethod
    def gcs_blob_exists(blob_path: str, bucket_name=bucket_name) -> bool:
        client = storage.Client(project= project_id)
        bucket = client.bucket(bucket_name or GcpUtilityService.bucket_name)
        blob = bucket.blob(blob_path)
        return blob.exists()

    @staticmethod
    def delete_gcs_blob_if_exists(blob_path: str, bucket_name=bucket_name):
        client = storage.Client(project= project_id)
        bucket = client.bucket(bucket_name or GcpUtilityService.bucket_name)
        blob = bucket.blob(blob_path)
        if blob.exists():
            blob.delete()

    # ---- Firestore ----

    @staticmethod
    def get_firestore_client():
        return firestore.Client()

    @staticmethod
    def get_collection(collection_name: str):
        return GcpUtilityService.get_firestore_client().collection(collection_name)

    @staticmethod
    def delete_all_documents_in_collection(collection_name: str) -> None:
        collection = GcpUtilityService.get_collection(collection_name)
        docs = collection.stream()
        for doc in docs:
            doc.reference.delete()

    # ---- Pub/Sub ----

    @staticmethod
    def get_pubsub_publisher():
        return pubsub_v1.PublisherClient()

    @staticmethod
    def publish_event(topic_name: str, event_data: dict) -> str:
        publisher = GcpUtilityService.get_pubsub_publisher()
        project_id = os.getenv("GCP_PROJECT_ID")
        topic_path = publisher.topic_path(project_id, topic_name)
        data = json.dumps(event_data).encode("utf-8")
        future = publisher.publish(topic_path, data)
        return future.result()
