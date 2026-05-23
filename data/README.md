# Data Directory

This directory is used to store the raw datasets required for the project.

### Important Notes
1. **Git Ignored**: All `.csv` and `.txt` files in this directory are ignored by Git (via `.gitignore`). This prevents uploading large datasets to GitHub and keeps the repository clean.
2. **Local Storage**: Each team member must manually place the dataset files into this folder after cloning the repository.

### Required Files
Ensure this directory contains the following files for the code to run correctly:
- `train.csv`: The training dataset.
- `test.csv`: The test dataset.

### Data Source
If these files are missing from your local environment, please download them from Kaggle:
[House Prices - Advanced Regression Techniques](https://www.kaggle.com/c/house-prices-advanced-regression-techniques/data)

### Path Usage in Code
When loading data in Notebooks or Python scripts, please use the standardized relative path:
```python
df_train = pd.read_csv('../data/train.csv')
df_test = pd.read_csv('../data/test.csv')