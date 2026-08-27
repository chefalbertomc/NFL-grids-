#!/usr/bin/env python3
import os
import urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE_DIR = "/Users/beto/.gemini/antigravity-ide/scratch/wings-and-wins"
OUT_DIR = "/Users/beto/.gemini/antigravity-ide/brain/82ce1305-6e18-47fc-98b8-d718960e021a"
LOGO_PATH = os.path.join(BASE_DIR, "img/logo.jpg")

# System fonts
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_ROUNDED = "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf"
FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

def download_qr(url, size=320):
    qr_api = f"https://api.qrserver.com/v1/create-qr-code/?size={size}x{size}&margin=10&data={urllib.parse.quote(url)}"
    temp_qr = "/tmp/dw_qr_temp.png"
    try:
        urllib.request.urlretrieve(qr_api, temp_qr)
        return Image.open(temp_qr).convert("RGBA")
    except Exception as e:
        print("QR download error:", e)
        img = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        return img

def create_base_card(w=1080, h=1920):
    img = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Clean slight off-white gradient / clean background
    for y in range(h):
        r = int(255 - (y / h) * 8)
        g = int(255 - (y / h) * 6)
        b = int(255 - (y / h) * 4)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # Outer border frame
    draw.rounded_rectangle([30, 30, w - 30, h - 30], radius=40, outline=(226, 232, 240), width=6)
    draw.rounded_rectangle([36, 36, w - 36, h - 36], radius=34, outline=(255, 209, 0), width=3)
    return img

def draw_top_pill(draw, text, y=80):
    pill_w = 840
    pill_h = 76
    x = (1080 - pill_w) // 2
    draw.rounded_rectangle([x, y, x + pill_w, y + pill_h], radius=38, fill=(15, 23, 42))
    
    font = get_font(FONT_BLACK, 32)
    # Center text
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (1080 - tw) // 2
    ty = y + (pill_h - th) // 2 - 4
    draw.text((tx, ty), text, fill=(255, 255, 255), font=font)

def draw_logo_section(img, y=190):
    # Official Drinks & Wins Logo
    logo = Image.open(LOGO_PATH).convert("RGBA")
    logo = logo.resize((320, 320), Image.Resampling.LANCZOS)

    # Mask for rounded corners on logo
    mask = Image.new("L", (320, 320), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.rounded_rectangle([0, 0, 320, 320], radius=44, fill=255)

    # Logo border
    draw = ImageDraw.Draw(img)
    bx = (1080 - 328) // 2
    by = y - 4
    draw.rounded_rectangle([bx, by, bx + 328, by + 328], radius=48, fill=(255, 209, 0))

    img.paste(logo, (bx + 4, by + 4), mask)

    # Subtitle under logo
    font_brand = get_font(FONT_BLACK, 44)
    font_sub = get_font(FONT_BOLD, 26)

    # DRINKS & WINS text
    bbox1 = draw.textbbox((0, 0), "DRINKS & WINS", font=font_brand)
    tw1 = bbox1[2] - bbox1[0]
    draw.text(((1080 - tw1) // 2, y + 345), "DRINKS & WINS", fill=(15, 23, 42), font=font_brand)

    # Slogan
    bbox2 = draw.textbbox((0, 0), "Juegos de Bar en tu Celular", font=font_sub)
    tw2 = bbox2[2] - bbox2[0]
    draw.text(((1080 - tw2) // 2, y + 398), "Juegos de Bar en tu Celular", fill=(100, 116, 139), font=font_sub)

def draw_footer_section(img, draw, cta_text, qr_img, url_display="bgames.s.gy/drinkandwins"):
    # CTA Text
    font_cta = get_font(FONT_BLACK, 36)
    bbox = draw.textbbox((0, 0), cta_text, font=font_cta)
    tw = bbox[2] - bbox[0]
    draw.text(((1080 - tw) // 2, 1260), cta_text, fill=(15, 23, 42), font=font_cta)

    # URL Banner
    url_w = 640
    url_h = 60
    ux = (1080 - url_w) // 2
    uy = 1320
    draw.rounded_rectangle([ux, uy, ux + url_w, uy + url_h], radius=30, fill=(255, 209, 0))
    
    font_url = get_font(FONT_BLACK, 30)
    ubbox = draw.textbbox((0, 0), url_display.upper(), font=font_url)
    utw = ubbox[2] - ubbox[0]
    draw.text(((1080 - utw) // 2, uy + 14), url_display.upper(), fill=(0, 0, 0), font=font_url)

    # QR Code Frame
    qr_x = (1080 - 360) // 2
    qr_y = 1400
    draw.rounded_rectangle([qr_x - 10, qr_y - 10, qr_x + 370, qr_y + 370], radius=32, fill=(255, 255, 255), outline=(255, 209, 0), width=6)
    
    qr_resized = qr_img.resize((360, 360), Image.Resampling.LANCZOS)
    img.paste(qr_resized, (qr_x, qr_y), qr_resized)

    # Bottom helper
    font_hint = get_font(FONT_BOLD, 22)
    hint_text = "ESCANEA CON TU CÁMARA O INGRESA EL LINK"
    hbbox = draw.textbbox((0, 0), hint_text, font=font_hint)
    htw = hbbox[2] - hbbox[0]
    draw.text(((1080 - htw) // 2, 1795), hint_text, fill=(100, 116, 139), font=font_hint)

def generate_all_5_cards():
    qr_img = download_qr("https://bgames.s.gy/drinkandwins", 360)

    # ================= CARD 1: ¿QUÉ ES DRINKS & WINS? =================
    img1 = create_base_card()
    draw1 = ImageDraw.Draw(img1)
    draw_top_pill(draw1, "🏅 ¿QUÉ ES DRINKS & WINS?")
    draw_logo_section(img1, 200)

    # Content Box
    draw1.rounded_rectangle([90, 680, 990, 1220], radius=32, fill=(248, 250, 252), outline=(226, 232, 240), width=3)
    
    # Feature Badges
    b_font = get_font(FONT_BOLD, 24)
    draw1.rounded_rectangle([130, 715, 520, 775], radius=30, fill=(255, 209, 0))
    draw1.text((160, 730), "Juegos de Bar en Vivo", fill=(0, 0, 0), font=b_font)

    draw1.rounded_rectangle([560, 715, 950, 775], radius=30, fill=(15, 23, 42))
    draw1.text((615, 730), "Premios en tu Mesa", fill=(255, 255, 255), font=b_font)

    # Title & Description
    f_title = get_font(FONT_BLACK, 38)
    f_desc = get_font(FONT_BOLD, 28)
    
    t1 = "Tu plataforma interactiva para partidos."
    tb1 = draw1.textbbox((0, 0), t1, font=f_title)
    draw1.text(((1080 - (tb1[2] - tb1[0])) // 2, 815), t1, fill=(15, 23, 42), font=f_title)

    lines = [
        "Pronostica marcadores y compite en vivo.",
        "Elige tus casillas en los Grids de la NFL,",
        "participa en trivias en las pantallas del bar",
        "y festeja con tus amigos mientras ganas."
    ]
    cur_y = 880
    for l in lines:
        tb = draw1.textbbox((0, 0), l, font=f_desc)
        draw1.text(((1080 - (tb[2] - tb[0])) // 2, cur_y), l, fill=(71, 85, 105), font=f_desc)
        cur_y += 44

    draw_footer_section(img1, draw1, "Unete a la diversion", qr_img)
    p1 = os.path.join(OUT_DIR, "tarjeta_1_que_es_drinks_and_wins.png")
    img1.save(p1)
    print("Saved:", p1)

    # ================= CARD 2: ¡VIVE LA NFL EN DRINKS & WINS! =================
    img2 = create_base_card()
    draw2 = ImageDraw.Draw(img2)
    draw_top_pill(draw2, "VIVE LA NFL EN DRINKS & WINS")
    draw_logo_section(img2, 200)

    draw2.rounded_rectangle([90, 680, 990, 1220], radius=32, fill=(248, 250, 252), outline=(226, 232, 240), width=3)

    # Load authentic badges: badge_grids.png and badge_survivor.png
    b_grids = Image.open(os.path.join(BASE_DIR, "img/games/badge_grids.png")).convert("RGBA")
    b_surv = Image.open(os.path.join(BASE_DIR, "img/games/badge_survivor.png")).convert("RGBA")
    b_grids = b_grids.resize((210, 210), Image.Resampling.LANCZOS)
    b_surv = b_surv.resize((210, 210), Image.Resampling.LANCZOS)

    # Mask for rounded badges
    b_mask = Image.new("L", (210, 210), 0)
    ImageDraw.Draw(b_mask).rounded_rectangle([0, 0, 210, 210], radius=28, fill=255)

    draw2.rounded_rectangle([236, 706, 454, 924], radius=32, fill=(255, 209, 0))
    img2.paste(b_grids, (240, 710), b_mask)

    draw2.rounded_rectangle([626, 706, 844, 924], radius=32, fill=(255, 209, 0))
    img2.paste(b_surv, (630, 710), b_mask)

    # Titles for games
    f_lbl = get_font(FONT_BLACK, 24)
    draw2.text((260, 935), "NFL GRIDS", fill=(15, 23, 42), font=f_lbl)
    draw2.text((660, 935), "SURVIVOR", fill=(15, 23, 42), font=f_lbl)

    t2 = "Gana premios durante todo el partido!"
    tb2 = draw2.textbbox((0, 0), t2, font=f_title)
    draw2.text(((1080 - (tb2[2] - tb2[0])) // 2, 985), t2, fill=(15, 23, 42), font=f_title)

    lines2 = [
        "- Grids: 100 casillas con premios en cada cuarto.",
        "- Survivor: Elige tu equipo ganador cada semana."
    ]
    cur_y = 1045
    for l in lines2:
        tb = draw2.textbbox((0, 0), l, font=f_desc)
        draw2.text(((1080 - (tb[2] - tb[0])) // 2, cur_y), l, fill=(71, 85, 105), font=f_desc)
        cur_y += 46

    draw_footer_section(img2, draw2, "Entra a tu tablero aqui", qr_img)
    p2 = os.path.join(OUT_DIR, "tarjeta_2_vive_la_nfl.png")
    img2.save(p2)
    print("Saved:", p2)

    # ================= CARD 3: DEMUESTRA TU INSTINTO GOLEADOR =================
    img3 = create_base_card()
    draw3 = ImageDraw.Draw(img3)
    draw_top_pill(draw3, "DEMUESTRA TU INSTINTO GOLEADOR")
    draw_logo_section(img3, 200)

    draw3.rounded_rectangle([90, 680, 990, 1220], radius=32, fill=(248, 250, 252), outline=(226, 232, 240), width=3)

    # Load authentic badges: badge_firststriker.png and badge_quinielas.png
    b_fs = Image.open(os.path.join(BASE_DIR, "img/games/badge_firststriker.png")).convert("RGBA")
    b_qu = Image.open(os.path.join(BASE_DIR, "img/games/badge_quinielas.png")).convert("RGBA")
    b_fs = b_fs.resize((210, 210), Image.Resampling.LANCZOS)
    b_qu = b_qu.resize((210, 210), Image.Resampling.LANCZOS)

    draw3.rounded_rectangle([236, 706, 454, 924], radius=32, fill=(255, 209, 0))
    img3.paste(b_fs, (240, 710), b_mask)

    draw3.rounded_rectangle([626, 706, 844, 924], radius=32, fill=(255, 209, 0))
    img3.paste(b_qu, (630, 710), b_mask)

    draw3.text((240, 935), "FIRST STRIKER", fill=(15, 23, 42), font=f_lbl)
    draw3.text((670, 935), "QUINIELAS", fill=(15, 23, 42), font=f_lbl)

    t3 = "Juega desde tu celular y festeja doble!"
    tb3 = draw3.textbbox((0, 0), t3, font=f_title)
    draw3.text(((1080 - (tb3[2] - tb3[0])) // 2, 985), t3, fill=(15, 23, 42), font=f_title)

    lines3 = [
        "- First Striker: Adivina el minuto del 1er gol.",
        "- Quinielas & Pick'em: Pronostica toda la jornada."
    ]
    cur_y = 1045
    for l in lines3:
        tb = draw3.textbbox((0, 0), l, font=f_desc)
        draw3.text(((1080 - (tb[2] - tb[0])) // 2, cur_y), l, fill=(71, 85, 105), font=f_desc)
        cur_y += 46

    draw_footer_section(img3, draw3, "Juega aqui con tu mesa", qr_img)
    p3 = os.path.join(OUT_DIR, "tarjeta_3_instinto_goleador.png")
    img3.save(p3)
    print("Saved:", p3)

    # ================= CARD 4: ¿ERES EL QUE MÁS SABE? =================
    img4 = create_base_card()
    draw4 = ImageDraw.Draw(img4)
    draw_top_pill(draw4, "ERES EL QUE MAS SABE?")
    draw_logo_section(img4, 200)

    draw4.rounded_rectangle([90, 680, 990, 1220], radius=32, fill=(248, 250, 252), outline=(226, 232, 240), width=3)

    # Load authentic badge: badge_trivia.png
    b_tr = Image.open(os.path.join(BASE_DIR, "img/games/badge_trivia.png")).convert("RGBA")
    b_tr = b_tr.resize((240, 240), Image.Resampling.LANCZOS)
    tr_mask = Image.new("L", (240, 240), 0)
    ImageDraw.Draw(tr_mask).rounded_rectangle([0, 0, 240, 240], radius=32, fill=255)

    draw4.rounded_rectangle([(1080 - 248) // 2, 706, (1080 + 248) // 2, 954], radius=36, fill=(255, 209, 0))
    img4.paste(b_tr, ((1080 - 240) // 2, 710), tr_mask)

    t4 = "Juega al mismo tiempo que las pantallas!"
    tb4 = draw4.textbbox((0, 0), t4, font=f_title)
    draw4.text(((1080 - (tb4[2] - tb4[0])) // 2, 975), t4, fill=(15, 23, 42), font=f_title)

    lines4 = [
        "Trivia en Vivo proyectada en el bar.",
        "Responde en tu celular antes de que acabe el tiempo,",
        "acumula puntos y sube al podio ganador."
    ]
    cur_y = 1035
    for l in lines4:
        tb = draw4.textbbox((0, 0), l, font=f_desc)
        draw4.text(((1080 - (tb[2] - tb[0])) // 2, cur_y), l, fill=(71, 85, 105), font=f_desc)
        cur_y += 44

    draw_footer_section(img4, draw4, "Demuestralo ahora", qr_img)
    p4 = os.path.join(OUT_DIR, "tarjeta_4_eres_el_que_mas_sabe.png")
    img4.save(p4)
    print("Saved:", p4)

    # ================= CARD 5: ¡LLEVA DRINKS & WINS CONTIGO! =================
    img5 = create_base_card()
    draw5 = ImageDraw.Draw(img5)
    draw_top_pill(draw5, "LLEVA DRINKS & WINS CONTIGO")
    draw_logo_section(img5, 200)

    draw5.rounded_rectangle([90, 680, 990, 1220], radius=32, fill=(248, 250, 252), outline=(226, 232, 240), width=3)

    t5 = "Instala la app en tu celular sin descargas:"
    tb5 = draw5.textbbox((0, 0), t5, font=f_title)
    draw5.text(((1080 - (tb5[2] - tb5[0])) // 2, 720), t5, fill=(15, 23, 42), font=f_title)

    # iPhone instructions box
    draw5.rounded_rectangle([130, 785, 950, 930], radius=20, fill=(255, 255, 255), outline=(203, 213, 225), width=2)
    f_step_title = get_font(FONT_BLACK, 26)
    f_step_desc = get_font(FONT_BOLD, 24)
    draw5.text((160, 805), "iPhone (Navegador Safari):", fill=(15, 23, 42), font=f_step_title)
    draw5.text((160, 850), "1. Toca el boton Compartir en la barra inferior", fill=(71, 85, 105), font=f_step_desc)
    draw5.text((160, 885), "2. Selecciona 'Agregar al inicio'", fill=(71, 85, 105), font=f_step_desc)

    # Android instructions box
    draw5.rounded_rectangle([130, 955, 950, 1100], radius=20, fill=(255, 255, 255), outline=(203, 213, 225), width=2)
    draw5.text((160, 975), "Android (Navegador Chrome):", fill=(15, 23, 42), font=f_step_title)
    draw5.text((160, 1020), "1. Toca el menu de tres puntos arriba a la derecha", fill=(71, 85, 105), font=f_step_desc)
    draw5.text((160, 1055), "2. Selecciona 'Instalar aplicacion' o 'Agregar a inicio'", fill=(71, 85, 105), font=f_step_desc)

    f_ready = get_font(FONT_BLACK, 26)
    r_text = "Listo para jugar en segundos!"
    rtb = draw5.textbbox((0, 0), r_text, font=f_ready)
    draw5.text(((1080 - (rtb[2] - rtb[0])) // 2, 1135), r_text, fill=(217, 119, 6), font=f_ready)

    draw_footer_section(img5, draw5, "Listo para jugar!", qr_img)
    p5 = os.path.join(OUT_DIR, "tarjeta_5_lleva_drinks_and_wins_contigo.png")
    img5.save(p5)
    print("Saved:", p5)

if __name__ == "__main__":
    generate_all_5_cards()
