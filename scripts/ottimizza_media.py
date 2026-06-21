#!/usr/bin/env python3
import os
import sys

# File paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)

BANNER_PNG = os.path.join(ROOT_DIR, "world_cup_header_banner.png")
BANNER_WEBP = os.path.join(ROOT_DIR, "world_cup_header_banner.webp")
CUP_PNG = os.path.join(ROOT_DIR, "world_cup_cup.png")
CUP_WEBP = os.path.join(ROOT_DIR, "world_cup_cup.webp")

def compress_image(src, dest, quality=85):
    if not os.path.exists(src):
        print(f"Errore: file sorgente {src} non trovato.")
        return False
        
    try:
        from PIL import Image
    except ImportError:
        print("\n[ERRORE] La libreria 'Pillow' non è installata.")
        print("Per installarla, esegui il seguente comando nel terminale:")
        print("  pip install pillow\n")
        return False
        
    try:
        print(f"Compressione di {os.path.basename(src)} in corso...")
        orig_size = os.path.getsize(src)
        
        im = Image.open(src)
        # Convert RGBA to RGB if saving as JPEG or if WebP has issues, 
        # but WebP supports alpha channel so RGBA is fine.
        im.save(dest, "webp", quality=quality)
        
        new_size = os.path.getsize(dest)
        savings = (orig_size - new_size) / orig_size * 100
        print(f"  -> Completato! Salvato in: {os.path.basename(dest)}")
        print(f"  -> Dimensione originaria: {orig_size / 1024:.1f} KB")
        print(f"  -> Dimensione ottimizzata: {new_size / 1024:.1f} KB")
        print(f"  -> Risparmio di spazio: {savings:.1f}%\n")
        return True
    except Exception as e:
        print(f"Errore durante la compressione di {src}: {e}")
        return False

def main():
    print("=========================================")
    print(" STRUMENTO COMPRESSIONE MEDIA WEBP")
    print("=========================================")
    
    # Compress banner
    banner_ok = compress_image(BANNER_PNG, BANNER_WEBP, quality=80)
    
    # Compress cup icon
    cup_ok = compress_image(CUP_PNG, CUP_WEBP, quality=85)
    
    if banner_ok and cup_ok:
        print("Tutti i file multimediali sono stati ottimizzati con successo!")
        print("Ora puoi eliminare i vecchi file .png o tenerli come backup.")
    else:
        print("Alcune conversioni non sono andate a buon fine.")

if __name__ == "__main__":
    main()
