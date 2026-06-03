import io
import os
import re
import csv
import json
import fitz
import base64
import shutil
import time
import sys
import logging
import pandas as pd
from datetime import datetime
from PIL import Image
from pathlib import Path
import configparser

from aws_utils.aws_services import AwsUtilityService, S3DataManager

# ---------- Base paths ---------- #
base = Path(__file__).parent

# ---------- Logging ---------- #
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger()
# optional file handler (avoid duplicates)
if not any(isinstance(h, logging.FileHandler) for h in logger.handlers):
    logger.addHandler(logging.FileHandler("pipeline.log", mode="a"))
print = logger.info  # redirect prints to logger


# ---------- IO helpers ---------- #
def open_pdf_using_fitz(pdf_path):
    """
    Open a PDF file using PyMuPDF (fitz).

    Args:
        pdf_path (str or io.BytesIO): Path to the PDF file or a BytesIO object.

    Returns:
        fitz.Document: Opened document.
    """
    if isinstance(pdf_path, io.BytesIO):
        return fitz.open(stream=pdf_path.getvalue(), filetype="pdf")
    if isinstance(pdf_path, (str, os.PathLike)) and str(pdf_path).lower().endswith(".pdf"):
        return fitz.open(str(pdf_path))
    raise TypeError(f"Unsupported type for pdf_path: {type(pdf_path)}")


def create_dir(dir_path):
    """Create a directory if it doesn't already exist."""
    os.makedirs(dir_path, exist_ok=True, mode=0o777)


def reset_folder(folder_path):
    """Reset a folder by deleting its contents and recreating it."""
    if os.path.exists(folder_path) and os.path.isdir(folder_path):
        shutil.rmtree(folder_path)
    create_dir(folder_path)


def read_config(path=base / "config.ini"):
    """Read configuration settings from a file."""
    config = configparser.ConfigParser()
    config.read(path)
    return config


def copy_file(source_path, destination_path):
    """Copy a file from source to destination."""
    shutil.copy(source_path, destination_path, follow_symlinks=True)


def read_img(img_path):
    """Read an image from the given path as RGB PIL.Image."""
    return Image.open(img_path).convert("RGB")


def encode_image(image_path):
    """
    Encode an image as Base64.

    Args:
        image_path (str): local path or S3 key (non-slash-leading treated as S3)
    """
    if image_path.startswith("/"):
        with open(image_path, "rb") as f:
            image_data = f.read()
    else:
        # Fetch the image data from S3
        image_data = AwsUtilityService.download_s3_object_data(keypath=image_path)
        image_stream = io.BytesIO(image_data)
        image_stream.seek(0)
        image_data = image_stream.read()
    return base64.b64encode(image_data).decode("utf-8")


def read_json(file_path):
    """Read a JSON file from local path."""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(data, save_path):
    """Save data to JSON locally (upload to S3 separately if needed)."""
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def read_txt(file_path):
    """Read a text file."""
    with open(file_path, "r") as f:
        return f.read()


def save_txt(data, save_path):
    """Write a text file."""
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(str(data))


# ---------- Pipeline helper ---------- #
class PipelineHelper:
    """
    Utility helpers for pipeline tasks such as logging and timing.
    """

    DOC_LOG_FILE_PATH = "logs/document_logs.json"

    @staticmethod
    def log_start(task_name):
        print(f"****** Start {task_name} ******")

    @staticmethod
    def log_end(task_name, start_time, s3_log_path, additional_info=""):
        end_time = time.time()
        print(f"Successfully completed {task_name}. {additional_info}")
        print(f"Time taken for {task_name}: {end_time - start_time:.2f} seconds")
        PipelineHelper.save_log_to_json(task_name, f"{end_time - start_time:.2f}", s3_log_path)

    @staticmethod
    def execute_task(task_name, s3_log_path, func, *args, **kwargs):
        """Execute a task and log its start/end."""
        PipelineHelper.log_start(task_name)
        start_time = time.time()
        result = func(*args, **kwargs)
        PipelineHelper.log_end(task_name, start_time, s3_log_path)
        return result

    @staticmethod
    def save_log_to_json(task_name, time_taken, s3_log_path):
        """Append/update a single task timing entry to an S3 JSON log."""
        file_path = s3_log_path
        logs = S3DataManager.read_json_from_s3_as_dict(file_path)

        # remove previous "process the ..." entry if present to keep last run
        if "process the" in task_name:
            delete_keys = [k for k in logs.keys() if "process the" in k]
            for i in delete_keys:
                del logs[i]

        logs[task_name] = time_taken
        S3DataManager.upload_dict_as_json_to_s3(logs, file_path)
        print(f"Updated logs for '{task_name}' saved to {file_path}")

    @staticmethod
    def save_document_log_to_json(document_name, s3_log_path, task_logs=None):
        """
        Save a consolidated log entry for a document to a JSON file in S3.
        """
        file_path = PipelineHelper.DOC_LOG_FILE_PATH
        task_logs = S3DataManager.read_json_from_s3_as_dict(s3_log_path)

        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Load existing consolidated list
        if os.path.exists(file_path):
            logs = read_json(file_path)
        else:
            logs = []

        document_log = {
            "document_name": document_name,
            "tasks": task_logs,
            "timestamp": datetime.now().strftime("%Y-%m-%d_%H-%M-%S"),
        }
        logs.append(document_log)
        save_json(logs, file_path)


# ---------- Misc helpers used by the app ---------- #
def save_uploaded_file(uploaded_file, save_path):
    """Save an uploaded file-like object to disk."""
    with open(save_path, "wb") as f:
        f.write(uploaded_file.getbuffer())


def get_notebook_name():
    """Return current notebook name from SageMaker metadata (if available)."""
    log_path = "/opt/ml/metadata/resource-metadata.json"
    with open(log_path, "r") as logs:
        _logs = json.load(logs)
    return _logs.get("SpaceName", "notebook")


def get_base64(file_path, f_type=""):
    """Convert a file to base64 string."""
    with open(file_path, "rb") as f:
        file = f.read()
    if f_type == "pdf":
        base64_pdf = base64.b64encode(file).decode("utf-8")
        pdf_display = f'<iframe src="data:application/pdf;base64,{base64_pdf}" width="700" height="800" type="application/pdf"></iframe>'
        return pdf_display
    else:
        base64_img = base64.b64encode(file).decode("utf-8")
        return base64_img


def generate_source_content(row):
    """
    Generate display HTML for a retrieved row (table/image/text).
    """
    if row["element_type"] in ["table", "image"]:
        base64_data = encode_image(row["element_path"])
        if base64_data:
            return f'<a href="data:image/jpeg;base64,{base64_data}"><img src="data:image/jpeg;base64,{base64_data}" /></a>'
        else:
            return f"Error: File not found for {row['element_type'].capitalize()}"
    else:
        return row["window"].replace('\n', '<br>')


def save_chat_history_to_s3(chat_history, keypath):
    """
    Save chat history to S3 as a CSV.
    Args:
        chat_history: list[tuple(user, assistant)]
        keypath: S3 keypath with timestamp placeholder
    """
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    keypath = keypath.format(timestamp=timestamp)

    csv_stream = io.StringIO()
    writer = csv.writer(csv_stream)
    
    writer.writerow(["User Query", "Assistant Response"])
    writer.writerows(chat_history)

    S3DataManager.upload_csv_to_s3(csv_stream, keypath)
    print(f"Chat history saved to S3 at {keypath}")


def save_eval_json_to_s3(response, keypath):
    """
    Append an evaluation response to a JSON stored in S3.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    data_to_save = {timestamp:response}

    existing = S3DataManager.read_json_from_s3_as_dict(keypath)
    existing.update(data_to_save)
    S3DataManager.upload_dict_as_json_to_s3(existing, keypath)
    print(f"Evaluation JSON saved to S3 at {keypath}")
