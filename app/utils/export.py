import io
import csv
import pandas as pd
from fastapi.responses import StreamingResponse


def export_to_csv(data: list[dict], filename: str) -> StreamingResponse:
    if not data:
        output = io.StringIO()
        output.write("No data available")
        output.seek(0)
        return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                                 headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
    )


def export_to_excel(data: list[dict], filename: str, sheet_name: str = "Sheet1") -> StreamingResponse:
    if not data:
        df = pd.DataFrame({"message": ["No data available"]})
    else:
        df = pd.DataFrame(data)

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name=sheet_name)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
    )
