from pathlib import Path
import math
import subprocess

from PIL import Image, ImageColor, ImageDraw, ImageFont

WIDTH, HEIGHT, FPS, DURATION = 1080, 1920, 30, 12.5
BG = "#F5F3ED"
SURFACE = "#FFFEFA"
INK = "#17211D"
MUTED = "#657069"
LINE = "#D8DBD4"
ACCENT = "#11664F"
ACCENT_SOFT = "#DCEDDF"

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "csv-klar-video-01.mp4"
FONT_SANS = "/System/Library/Fonts/SFNS.ttf"
FONT_MONO = "/System/Library/Fonts/SFNSMono.ttf"


def font(size, mono=False):
    return ImageFont.truetype(FONT_MONO if mono else FONT_SANS, size)


def ease(value):
    value = max(0.0, min(1.0, value))
    return 1 - (1 - value) ** 3


def fade(start, end, time):
    return ease((time - start) / (end - start))


def text(draw, position, value, size, color=INK, mono=False, anchor="la"):
    draw.text(position, value, font=font(size, mono), fill=color, anchor=anchor)


def draw_table(draw, progress, alpha):
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    layer = ImageDraw.Draw(overlay)
    opacity = round(255 * alpha)
    surface = (*ImageColor.getrgb(SURFACE), opacity)
    line = (*ImageColor.getrgb(LINE), opacity)
    ink = (*ImageColor.getrgb(INK), opacity)
    muted = (*ImageColor.getrgb(MUTED), opacity)
    accent_soft = (*ImageColor.getrgb(ACCENT_SOFT), opacity)

    left, top, right, bottom = 70, 660, 1010, 1130
    layer.rounded_rectangle((left, top, right, bottom), radius=18, fill=surface, outline=line, width=3)
    layer.rectangle((left, top, right, top + 88), fill=accent_soft)
    layer.text((left + 34, top + 46), "IMPORT-VORSCHAU", font=font(25, True), fill=ink, anchor="lm")

    split = ease(progress)
    raw_alpha = round(opacity * (1 - split))
    if raw_alpha:
        layer.text(
            (left + 34, top + 185),
            "Ada;ada@example.org;Berlin;1250,00",
            font=font(28, True), fill=(*ImageColor.getrgb(INK), raw_alpha), anchor="lm"
        )
        layer.text(
            (left + 34, top + 285),
            "Linus;;Helsinki;980,50",
            font=font(28, True), fill=(*ImageColor.getrgb(MUTED), raw_alpha), anchor="lm"
        )

    table_alpha = round(opacity * split)
    if table_alpha:
        widths = [230, 325, 205, 180]
        headers = ["Name", "E-Mail", "Stadt", "Umsatz"]
        row_one = ["Ada", "ada@…", "Berlin", "1250,00"]
        row_two = ["Linus", "", "Helsinki", "980,50"]
        x = left
        for index, column_width in enumerate(widths):
            if index:
                layer.line((x, top + 88, x, bottom), fill=(*ImageColor.getrgb(LINE), table_alpha), width=2)
            layer.text((x + 20, top + 142), headers[index], font=font(23), fill=(*ImageColor.getrgb(MUTED), table_alpha), anchor="lm")
            layer.text((x + 20, top + 235), row_one[index], font=font(28, True), fill=(*ImageColor.getrgb(INK), table_alpha), anchor="lm")
            layer.text((x + 20, top + 335), row_two[index], font=font(28, True), fill=(*ImageColor.getrgb(INK), table_alpha), anchor="lm")
            x += column_width
        layer.line((left, top + 180, right, top + 180), fill=(*ImageColor.getrgb(LINE), table_alpha), width=2)
        layer.line((left, top + 280, right, top + 280), fill=(*ImageColor.getrgb(LINE), table_alpha), width=2)

    return overlay


def render_frame(frame_number):
    time = frame_number / FPS
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)

    text(draw, (70, 150), "CSV FEHLER 01", 25, ACCENT, mono=True)

    hook_alpha = 1 - fade(8.8, 9.4, time)
    if hook_alpha > 0:
        layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
        layer_draw = ImageDraw.Draw(layer)
        color = (*ImageColor.getrgb(INK), round(255 * hook_alpha))
        layer_draw.text((70, 270), "Diese CSV ist", font=font(92), fill=color)
        layer_draw.text((70, 372), "nicht kaputt.", font=font(92), fill=color)
        image = Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")
        draw = ImageDraw.Draw(image)

    table_alpha = fade(1.7, 2.3, time) * (1 - fade(8.8, 9.4, time))
    table_progress = fade(5.4, 7.5, time)
    if table_alpha > 0:
        image = Image.alpha_composite(image.convert("RGBA"), draw_table(draw, table_progress, table_alpha)).convert("RGB")
        draw = ImageDraw.Draw(image)

    if 2.2 <= time < 8.8:
        caption_alpha = min(fade(2.2, 2.8, time), 1 - fade(5.0, 5.5, time))
        if caption_alpha > 0:
            color = (*ImageColor.getrgb(MUTED), round(255 * caption_alpha))
            layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
            ImageDraw.Draw(layer).text((70, 1225), "Trotzdem landet alles in einer Spalte.", font=font(38), fill=color)
            image = Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")
            draw = ImageDraw.Draw(image)

        selector_alpha = fade(5.0, 5.5, time)
        if selector_alpha > 0:
            selector_color = ACCENT if table_progress > 0.5 else MUTED
            draw.rounded_rectangle((70, 1210, 1010, 1365), radius=16, fill=SURFACE, outline=LINE, width=3)
            text(draw, (105, 1262), "TRENNZEICHEN", 22, MUTED, mono=True)
            old_x = 635 - round(150 * table_progress)
            text(draw, (old_x, 1308), "Komma", 32, MUTED, anchor="mm")
            arrow_x = 770
            text(draw, (arrow_x, 1308), "→", 36, ACCENT, anchor="mm")
            text(draw, (900, 1308), "Semikolon", 32, selector_color, anchor="mm")

    reveal_alpha = fade(8.8, 9.4, time) * (1 - fade(10.35, 10.6, time))
    if reveal_alpha > 0:
        color = (*ImageColor.getrgb(INK), round(255 * reveal_alpha))
        accent = (*ImageColor.getrgb(ACCENT), round(255 * reveal_alpha))
        layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
        layer_draw = ImageDraw.Draw(layer)
        layer_draw.text((70, 650), "Der Trenner", font=font(104), fill=color)
        layer_draw.text((70, 770), "war falsch.", font=font(104), fill=accent)
        layer_draw.text((70, 970), "Nicht die Datei.", font=font(42), fill=(*ImageColor.getrgb(MUTED), round(255 * reveal_alpha)))
        image = Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")
        draw = ImageDraw.Draw(image)

    cta = fade(10.35, 10.7, time)
    if cta > 0:
        overlay = Image.new("RGBA", image.size, (*ImageColor.getrgb(INK), round(255 * cta)))
        image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(image)
        text(draw, (540, 700), "Prüfe deine CSV", 78, SURFACE, anchor="mm")
        text(draw, (540, 795), "kostenlos.", 78, SURFACE, anchor="mm")
        draw.rectangle((400, 930, 680, 1060), fill=ACCENT)
        text(draw, (540, 995), "CSV KLAR", 34, SURFACE, mono=True, anchor="mm")
        text(draw, (540, 1165), "Lokal im Browser · Keine Uploads", 30, "#B8C3BD", anchor="mm")

    return image


def main():
    command = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUTPUT)
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for frame_number in range(math.ceil(DURATION * FPS)):
            process.stdin.write(render_frame(frame_number).tobytes())
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise SystemExit("ffmpeg konnte das Video nicht rendern")
    print(OUTPUT)


if __name__ == "__main__":
    main()
