**Overview of src folder**

src contains four key modules

1. Indexing Pipeline (indexing\_pipeline): Extracts tables, images and text from documents, chunks them, creates embeddings and stores them in Pinecone
2. Inference Pipeline (inference\_pipeline): Performs retrieval of chunks from Pinecone, does reranking to return top\_k chunks and generates answer using LLM
3. Evaluation Pipeline (evaluation\_pipeline): Performs answer evaluation and chunk evaluation against manually created ground truth (in S3)
4. Streamlit App (streamlit\_ui): Contains two streamlit apps for demo purpose - 1. With indexing, 2. Without indexing

To launch streamlit app, use main.py

Additionally src also contains the below tools

1. models: contains doclayout model and use\_model.py for invoking models via BXAI client
2. config.ini: configuration file for all the above pipelines
3. utils.py: contains helper functions used across the pipelines
4. aws\_utils: contains helper functions for AWS S3 CRUD operations

Detailed readmes are provided on the each of the above in respective folders