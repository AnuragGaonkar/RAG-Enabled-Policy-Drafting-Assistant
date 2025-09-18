# pdf_processor.py
import os
import requests
from bs4 import BeautifulSoup
import pdfplumber
from PIL import Image
import pytesseract
import fitz  # PyMuPDF
from pymongo import MongoClient
from datetime import datetime

# Mapping of departments to their policy document pages (example URLs)
departments = {
    "health": "https://www.mohfw.gov.in/?q=en/documents/policy",
    "finance": "https://financialservices.gov.in/policies",
    "education": "https://mhrd.gov.in/policies",
    "environment": "http://moef.gov.in/en/policies",
    "agriculture": "https://agricoop.nic.in/policies",
}

BASE_STORAGE_PATH = "./pdfs/"

# MongoDB Setup
client = MongoClient("mongodb://localhost:27017/policy-agent")
db = client['policy_db']
collection = db['documents']

def download_pdf(pdf_url, department):
    department_folder = os.path.join(BASE_STORAGE_PATH, department)
    if not os.path.exists(department_folder):
        os.makedirs(department_folder)
    filename = pdf_url.split("/")[-1].split("?")[0]
    filepath = os.path.join(department_folder, filename)

    if os.path.exists(filepath):
        print(f"{filename} already downloaded for {department}.")
        return filepath

    print(f"Downloading {filename} for {department} ...")
    response = requests.get(pdf_url)
    response.raise_for_status()
    with open(filepath, "wb") as f:
        f.write(response.content)

    return filepath

def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
            else:
                text += ocr_page(pdf_path, page.page_number) + "\n"
    return text

def ocr_page(pdf_path, page_num):
    doc = fitz.open(pdf_path)
    page = doc.load_page(page_num - 1)  # zero-based index
    pix = page.get_pixmap()
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    ocr_text = pytesseract.image_to_string(img)
    return ocr_text

def save_extracted_text_to_db(metadata, full_text):
    record = {
        "title": metadata.get("title"),
        "url": metadata.get("url"),
        "downloaded_at": datetime.utcnow(),
        "content": full_text,
        "department": metadata.get("department", "unknown")
    }
    existing = collection.find_one({"url": metadata.get("url")})
    if existing:
        collection.update_one({"_id": existing["_id"]}, {"$set": record})
        print(f"Updated record for {metadata.get('title')} in MongoDB.")
    else:
        collection.insert_one(record)
        print(f"Inserted new record for {metadata.get('title')} in MongoDB.")

def crawl_and_process(department_key):
    base_url = departments.get(department_key)
    if not base_url:
        print(f"No URL configured for department {department_key}")
        return

    print(f"Fetching policy webpage for {department_key} from {base_url}")
    try:
        response = requests.get(base_url)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to fetch {base_url}: {e}")
        return

    soup = BeautifulSoup(response.text, "html.parser")

    pdf_links = []
    for link in soup.find_all("a", href=True):
        href = link["href"]
        if href.lower().endswith(".pdf"):
            full_url = href if href.startswith("http") else base_url.rstrip("/") + href
            pdf_links.append(full_url)

    print(f"Found {len(pdf_links)} PDF links for {department_key}")

    for pdf_link in pdf_links:
        try:
            path = download_pdf(pdf_link, department_key)
            extracted_text = extract_text_from_pdf(path)
            metadata = {
                "title": os.path.basename(path),
                "url": pdf_link,
                "department": department_key
            }
            save_extracted_text_to_db(metadata, extracted_text)
        except Exception as e:
            print(f"Error processing {pdf_link}: {e}")

if __name__ == "__main__":
    # Run crawl and process for all departments
    for dept_key in departments.keys():
        crawl_and_process(dept_key)
