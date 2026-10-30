"""
Export des 5 matrices GRC dans un classeur Excel mis en forme (outputs/matrices_grc.xlsx).

    python cockpit/export_xlsx.py

Le cockpit utilise aussi `classeur_matrices()` pour le bouton « Télécharger en Excel ».
"""
from __future__ import annotations

import io
import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

RACINE = Path(__file__).resolve().parent.parent
MATRICES = RACINE / "outputs" / "matrices" / "matrices.json"
SORTIE = RACINE / "outputs" / "matrices_grc.xlsx"

TITRES = {
    "M1_tracabilite": ("M1 Traçabilité", "Chaque exigence reliée à son article, sa citation officielle et ses échéances"),
    "M2_impact": ("M2 Impact", "Processus, systèmes, données et contrats concernés"),
    "M3_couverture": ("M3 Couverture", "Comparaison des exigences avec les contrôles existants"),
    "M4_risque": ("M4 Risque", "Risque inhérent et résiduel (probabilité × impact, réduit par la couverture)"),
    "M5_jurisprudence": ("M5 Jurisprudence", "Décisions pertinentes associées aux exigences (Judilibre)"),
}

COULEURS = {
    "Critique": "F8D7DA", "Élevé": "FDE2C4", "Modéré": "FFF3CD", "Faible": "D4EDDA",
    "Couverte": "D4EDDA", "Partielle": "FFF3CD", "Non couverte": "F8D7DA",
    "Validée": "D4EDDA", "Corrigée": "D1ECF1", "Rejetée": "E2E3E5", "À valider": "FFF3CD",
}
ENTETE = PatternFill("solid", fgColor="1F3A5F")
BORD = Border(*(Side(style="thin", color="D0D5DD"),) * 4)
LARGEURS = {"Obligation": 60, "Citation (texte officiel)": 60, "Écart": 50, "Conséquences": 55, "Contrôles existants": 50,
            "Processus": 45, "Systèmes": 45, "Données": 35, "Contrats": 40, "Intitulé": 40, "Risque": 40, "Texte": 35, "URL officielle": 30}


def _feuille(wb: Workbook, cle: str, lignes: list[dict]) -> None:
    titre, sous_titre = TITRES[cle]
    ws = wb.create_sheet(titre)
    ws["A1"] = titre
    ws["A1"].font = Font(bold=True, size=14, color="1F3A5F")
    ws["A2"] = sous_titre
    ws["A2"].font = Font(italic=True, color="667085")
    if not lignes:
        ws["A4"] = "Aucune donnée"
        return
    colonnes = list(lignes[0].keys())
    for j, col in enumerate(colonnes, start=1):
        c = ws.cell(row=4, column=j, value=col)
        c.font, c.fill, c.border = Font(bold=True, color="FFFFFF"), ENTETE, BORD
        c.alignment = Alignment(wrap_text=True, vertical="center")
        ws.column_dimensions[get_column_letter(j)].width = LARGEURS.get(col, 16 if col != "ID exigence" else 18)
    for i, ligne in enumerate(lignes, start=5):
        for j, col in enumerate(colonnes, start=1):
            val = ligne.get(col, "")
            c = ws.cell(row=i, column=j, value=val)
            c.alignment = Alignment(wrap_text=True, vertical="top")
            c.border = BORD
            if isinstance(val, str) and val in COULEURS:
                c.fill = PatternFill("solid", fgColor=COULEURS[val])
    ws.freeze_panes = "B5"
    ws.auto_filter.ref = f"A4:{get_column_letter(len(colonnes))}{len(lignes) + 4}"


def classeur_matrices(matrices: dict | None = None) -> bytes:
    if matrices is None:
        matrices = json.loads(MATRICES.read_text(encoding="utf-8"))
    wb = Workbook()
    synthese = wb.active
    synthese.title = "Synthèse"
    synthese["A1"] = "Matrices GRC — agent de veille NIS 2"
    synthese["A1"].font = Font(bold=True, size=14, color="1F3A5F")
    synthese["A2"] = "Les 5 matrices partagent les mêmes identifiants d'exigence (colonne « ID exigence »)."
    for i, (cle, (titre, sous_titre)) in enumerate(TITRES.items(), start=4):
        synthese.cell(row=i, column=1, value=titre).font = Font(bold=True)
        synthese.cell(row=i, column=2, value=sous_titre)
        synthese.cell(row=i, column=3, value=f"{len(matrices.get(cle, []))} ligne(s)")
    synthese.column_dimensions["A"].width = 20
    synthese.column_dimensions["B"].width = 75
    synthese.column_dimensions["C"].width = 14
    for cle in TITRES:
        _feuille(wb, cle, matrices.get(cle, []))
    tampon = io.BytesIO()
    wb.save(tampon)
    return tampon.getvalue()


if __name__ == "__main__":
    SORTIE.write_bytes(classeur_matrices())
    print(f"✓ {SORTIE.relative_to(RACINE)}")
