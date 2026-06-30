#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  release.sh — Genera los artefactos de distribución de Newsday
#
#  Una sola fuente (el árbol versionado en git) → tres distribuciones:
#    1. dist/newsday-X.Y.Z.zip          → instalación completa (script PHP)
#    2. dist/newsday-update-X.Y.Z.zip   → update acumulativo (apply-update)
#    3. imagen Docker  newsday:X.Y.Z    → opcional, con --docker
#
#  La fuente es `git archive HEAD`: solo entra lo versionado, así que los
#  datos de cada instalación (content/, media/, backups/, newsday-config.php,
#  favicons de raíz…) y el material de cliente quedan fuera por construcción.
#  El update es "completo": cada zip lleva TODO el código a esa versión, de
#  modo que aplicarlo desde cualquier versión previa deja la instalación al día.
#
#  Uso:
#    tools/release.sh             # genera los dos ZIP en dist/
#    tools/release.sh --docker    # además construye la imagen Docker
#    tools/release.sh --publish   # crea el tag vX.Y.Z y la GitHub Release
# ════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(tr -d '[:space:]' < VERSION)"
[ -n "$VERSION" ] || { echo "✗ VERSION vacío"; exit 1; }

DIST="$ROOT/dist"
DATE="$(date +%Y-%m-%d)"
BUILD_DOCKER=0
PUBLISH=0
for arg in "$@"; do
  case "$arg" in
    --docker)  BUILD_DOCKER=1 ;;
    --publish) PUBLISH=1 ;;
    *) echo "✗ Flag desconocido: $arg"; exit 1 ;;
  esac
done

# Aviso si hay cambios sin commitear (el build usa HEAD, no el working tree)
if ! git diff --quiet HEAD 2>/dev/null; then
  echo "⚠ Hay cambios sin commitear; el build empaqueta HEAD, no el working tree."
fi

rm -rf "$DIST"
mkdir -p "$DIST"

echo "▶ Newsday $VERSION — generando artefactos…"

# ── 1. ZIP de instalación completa (con prefijo newsday/) ─────────
git archive --format=zip --prefix="newsday/" -o "$DIST/newsday-$VERSION.zip" HEAD
echo "  ✓ newsday-$VERSION.zip (instalación completa)"

# ── 2. ZIP de update acumulativo (árbol plano + manifiesto) ───────
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
git archive HEAD | tar -x -C "$STAGE"

cat > "$STAGE/newsday-update.json" <<JSON
{
  "version": "$VERSION",
  "date": "$DATE",
  "type": "cumulative",
  "generatedBy": "tools/release.sh"
}
JSON

( cd "$STAGE" && zip -qr "$DIST/newsday-update-$VERSION.zip" . -x ".git/*" )
echo "  ✓ newsday-update-$VERSION.zip (update acumulativo)"

# ── 3. Imagen Docker (opcional) ───────────────────────────────────
if [ "$BUILD_DOCKER" = "1" ]; then
  if command -v docker >/dev/null 2>&1; then
    docker build -t "newsday:$VERSION" -t "newsday:latest" "$ROOT"
    echo "  ✓ imagen Docker newsday:$VERSION"
  else
    echo "  ⚠ docker no disponible; omito la imagen"
  fi
fi

echo "▶ Artefactos en dist/:"
ls -lh "$DIST"

# ── 4. GitHub Release (opcional) ──────────────────────────────────
if [ "$PUBLISH" = "1" ]; then
  command -v gh >/dev/null 2>&1 || { echo "✗ gh (GitHub CLI) no disponible"; exit 1; }

  TAG="v$VERSION"

  # El release debe reflejar HEAD: avisar si hay cambios sin commitear
  if ! git diff --quiet HEAD 2>/dev/null; then
    echo "✗ Hay cambios sin commitear; commitea antes de publicar el release."; exit 1
  fi

  # Crear y subir el tag si no existe
  if ! git rev-parse "$TAG" >/dev/null 2>&1; then
    git tag -a "$TAG" -m "Newsday $VERSION"
    git push origin "$TAG"
    echo "  ✓ tag $TAG creado y subido"
  else
    echo "  • tag $TAG ya existe; reutilizando"
  fi

  NOTES="Newsday $VERSION ($DATE)

- \`newsday-$VERSION.zip\` — instalación completa (descomprime en el servidor → instalador automático).
- \`newsday-update-$VERSION.zip\` — update acumulativo (panel → Ajustes → Actualizar). No toca datos, config ni .htaccess; crea rollback automático."

  if gh release view "$TAG" >/dev/null 2>&1; then
    gh release upload "$TAG" "$DIST/newsday-$VERSION.zip" "$DIST/newsday-update-$VERSION.zip" --clobber
    echo "  ✓ assets actualizados en la release $TAG"
  else
    gh release create "$TAG" \
      "$DIST/newsday-$VERSION.zip" "$DIST/newsday-update-$VERSION.zip" \
      --title "Newsday $VERSION" --notes "$NOTES"
    echo "  ✓ GitHub Release $TAG creada"
  fi
fi

echo "▶ Listo."
