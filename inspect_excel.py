import pandas as pd
import json

file_path = r'c:\Users\leidiane.silva\Documents\validacao_faturamento\SANTHER ABRIL.xlsx'

try:
    # Read all sheets
    xl = pd.ExcelFile(file_path)
    sheets = xl.sheet_names
    
    result = {"sheets": sheets, "data": {}}
    
    for sheet in sheets:
        df = pd.read_excel(file_path, sheet_name=sheet).head(10)
        result["data"][sheet] = df.to_dict(orient='records')
        
    print(json.dumps(result, indent=2, default=str))
except Exception as e:
    print(f"Error: {e}")
