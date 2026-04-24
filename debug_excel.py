import pandas as pd
import json

file_path = r'c:\Users\leidiane.silva\Documents\validacao_faturamento\SANTHER ABRIL.xlsx'

try:
    xl = pd.ExcelFile(file_path)
    for sheet in xl.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df = pd.read_excel(file_path, sheet_name=sheet, header=None)
        print(df.head(10).to_string())
except Exception as e:
    print(f"Error: {e}")
