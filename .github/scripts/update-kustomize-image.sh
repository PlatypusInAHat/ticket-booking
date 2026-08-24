#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "Usage: $0 <kustomization-file> <service> <new-image-name> <new-tag>" >&2
  exit 2
fi

kustomization_file="$1"
service="$2"
new_image_name="$3"
new_tag="$4"
base_image="ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/ticketstage-${service}"

if [ ! -f "$kustomization_file" ]; then
  echo "Kustomization file not found: ${kustomization_file}" >&2
  exit 1
fi

if ! grep -Fq "name: ${base_image}" "$kustomization_file"; then
  echo "Image entry not found for service=${service} base=${base_image}" >&2
  exit 1
fi

tmp_file="$(mktemp "${kustomization_file}.XXXXXX")"
cleanup() {
  rm -f "$tmp_file"
}
trap cleanup EXIT

awk \
  -v base="$base_image" \
  -v image="$new_image_name" \
  -v tag="$new_tag" \
  '
    {
      line = $0
      sub(/\r$/, "", line)
    }

    line == "  - name: " base {
      in_entry = 1
      print
      next
    }

    in_entry && line ~ /^[[:space:]]+newName:/ {
      sub(/newName:.*/, "newName: " image)
      print
      next
    }

    in_entry && line ~ /^[[:space:]]+newTag:/ {
      sub(/newTag:.*/, "newTag: " tag)
      in_entry = 0
      changed = 1
      print
      next
    }

    {
      print
    }

    END {
      if (!changed) {
        exit 1
      }
    }
  ' "$kustomization_file" > "$tmp_file"

mv "$tmp_file" "$kustomization_file"
trap - EXIT

echo "Updated ${service}: ${new_image_name}:${new_tag}"
