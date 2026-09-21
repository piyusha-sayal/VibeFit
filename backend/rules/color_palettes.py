"""Palette data for the twelve personal-colour seasons.

Static, deterministic and free: no AI call generates any of this. Each season
carries clothing, makeup, hair and metal palettes plus garment notes for both
Indian and global wardrobes, because the same season means different things to
someone shopping for a saree and someone shopping for a suit.

Swatch shape is {"name": str, "hex": "#rrggbb"}. `compare` is deliberately not
called "avoid": these are the colours worth holding beside the face to see the
difference for yourself, not a prohibition.
"""
from __future__ import annotations

from typing import TypedDict


class Swatch(TypedDict):
    name: str
    hex: str


def _s(name: str, hex_: str) -> Swatch:
    return {"name": name, "hex": hex_}


# Family-level traits shared by the three seasons inside each family.
FAMILY_TRAITS: dict[str, dict[str, str]] = {
    "spring": {"undertone": "warm", "summary": "Warm and clear, lit from within."},
    "summer": {"undertone": "cool", "summary": "Cool and soft, gently blended."},
    "autumn": {"undertone": "warm", "summary": "Warm and rich, earthy and grounded."},
    "winter": {"undertone": "cool", "summary": "Cool and sharp, high definition."},
}

SEASONS: dict[str, dict] = {
    # ---------------------------------------------------------------- spring
    "light_spring": {
        "label": "Light Spring",
        "family": "spring",
        "depth": "light",
        "chroma": "bright",
        "contrast": "low",
        "summary": "Delicate warmth. Light, fresh colours keep your features lit without weighing them down.",
        "best": [
            _s("Peach", "#ffb997"), _s("Coral Pink", "#ff9e8a"), _s("Light Aqua", "#8fd6d0"),
            _s("Butter Yellow", "#ffe9a8"), _s("Apple Green", "#a8d982"), _s("Periwinkle", "#a9b8f0"),
        ],
        "neutrals": [_s("Ivory", "#f6efe2"), _s("Camel", "#c9a57a"), _s("Warm Grey", "#bdb3a6"), _s("Soft Navy", "#4a5f82")],
        "accents": [_s("Watermelon", "#f4737c"), _s("Turquoise", "#4ec3c0"), _s("Daffodil", "#ffd94f")],
        "compare": [_s("Black", "#111111"), _s("Burgundy", "#5d1a2b"), _s("Charcoal", "#36393d")],
        "lipstick": [_s("Peach Nude", "#e09480"), _s("Coral", "#f57f6d"), _s("Warm Rose", "#e07a86"), _s("Apricot Tint", "#f0a184")],
        "blush": [_s("Peach", "#f4a78d"), _s("Warm Apricot", "#f2b393"), _s("Soft Coral", "#f18e82")],
        "eyeshadow": [_s("Champagne", "#f0ddc4"), _s("Warm Taupe", "#c0a086"), _s("Soft Moss", "#9aa87c"), _s("Light Bronze", "#c79a63")],
        "hair": [_s("Golden Blonde", "#d9b06a"), _s("Light Caramel", "#b98a56"), _s("Honey Brown", "#9a6f45"), _s("Strawberry Blonde", "#c98a5f")],
        "metals": ["Yellow gold", "Rose gold", "Light bronze"],
        "garments": {
            "indian": ["Peach or coral georgette saree", "Mint and gold kurta set", "Ivory lehenga with warm gold work"],
            "global": ["Camel trench over an ivory knit", "Coral linen shirt", "Light denim with a butter-yellow top"],
        },
    },
    "warm_spring": {
        "label": "Warm Spring",
        "family": "spring",
        "depth": "medium",
        "chroma": "bright",
        "contrast": "medium",
        "summary": "Golden and sunlit. Colours with visible warmth in them read as natural on you.",
        "best": [
            _s("Golden Yellow", "#f2c14e"), _s("Warm Coral", "#f4795b"), _s("Grass Green", "#79b champion"[:7]), _s("Turquoise", "#3fbfb0"),
            _s("Salmon", "#f28a72"), _s("Marigold", "#f6a623"),
        ],
        "neutrals": [_s("Cream", "#f4ead7"), _s("Golden Beige", "#d8b487"), _s("Warm Brown", "#7c5636"), _s("Teal Navy", "#2f5d63")],
        "accents": [_s("Poppy Red", "#e8503a"), _s("Jade", "#37a884"), _s("Amber", "#e09422")],
        "compare": [_s("Icy Pink", "#f2d6e4"), _s("Cool Grey", "#9aa3ab"), _s("Black", "#111111")],
        "lipstick": [_s("Warm Coral", "#ef6f56"), _s("Terracotta", "#c96a4e"), _s("Golden Red", "#d94f35"), _s("Peach Brown", "#c9826a")],
        "blush": [_s("Apricot", "#f2a074"), _s("Warm Peach", "#f08f6f"), _s("Golden Coral", "#ee7f5f")],
        "eyeshadow": [_s("Bronze", "#b07636"), _s("Warm Copper", "#c2703f"), _s("Olive", "#7e8449"), _s("Golden Sand", "#e2c48e")],
        "hair": [_s("Golden Brown", "#8a5a30"), _s("Copper", "#a85a2b"), _s("Caramel", "#b3803f"), _s("Warm Chestnut", "#6f4527")],
        "metals": ["Yellow gold", "Antique gold", "Copper"],
        "garments": {
            "indian": ["Marigold or haldi-yellow kurta", "Coral Banarasi saree with gold zari", "Rust and green bandhani dupatta"],
            "global": ["Camel blazer with a cream shirt", "Terracotta knit dress", "Olive chinos with a coral tee"],
        },
    },
    "bright_spring": {
        "label": "Bright Spring",
        "family": "spring",
        "depth": "medium",
        "chroma": "bright",
        "contrast": "high",
        "summary": "Clear and high-energy. Saturated warm colours hold their own against your natural contrast.",
        "best": [
            _s("Bright Coral", "#ff6f52"), _s("Emerald", "#00a878"), _s("Hot Turquoise", "#00bcd4"),
            _s("Clear Yellow", "#ffd230"), _s("Bright Violet", "#7b5fd6"), _s("Watermelon Red", "#f2385a"),
        ],
        "neutrals": [_s("Ivory", "#f7f1e4"), _s("True Navy", "#1f3a7a"), _s("Warm Taupe", "#a79176"), _s("Bright Charcoal", "#3a3f45")],
        "accents": [_s("Lime", "#b8e229"), _s("Fuchsia", "#e6399b"), _s("Cobalt", "#2a5cd7")],
        "compare": [_s("Dusty Rose", "#c39a9a"), _s("Mushroom", "#a99e94"), _s("Muted Sage", "#9aa79a")],
        "lipstick": [_s("Bright Coral", "#fb6a4f"), _s("Clear Red", "#e63a2e"), _s("Warm Fuchsia", "#e14a82"), _s("Poppy", "#f05138")],
        "blush": [_s("Bright Peach", "#ff9276"), _s("Coral Pink", "#fa8080"), _s("Warm Rose", "#ef6e77")],
        "eyeshadow": [_s("Clear Gold", "#e8c260"), _s("Teal", "#1f8f8f"), _s("Warm Plum", "#8a4f72"), _s("Espresso", "#4a3327")],
        "hair": [_s("Rich Golden Brown", "#7a4c26"), _s("Bright Auburn", "#9c3d1f"), _s("Dark Honey", "#8a5f2e"), _s("Deep Chestnut", "#5a3620")],
        "metals": ["Bright yellow gold", "Polished brass", "Rose gold"],
        "garments": {
            "indian": ["Emerald silk saree with gold border", "Bright coral Anarkali", "Turquoise and gold lehenga"],
            "global": ["Cobalt shirt with white trousers", "Emerald wrap dress", "Bright coral blazer over ivory"],
        },
    },
    # ---------------------------------------------------------------- summer
    "light_summer": {
        "label": "Light Summer",
        "family": "summer",
        "depth": "light",
        "chroma": "muted",
        "contrast": "low",
        "summary": "Cool and airy. Soft, light colours sit comfortably against your gentle contrast.",
        "best": [
            _s("Powder Blue", "#a8c6e8"), _s("Soft Rose", "#e4b3c2"), _s("Lavender", "#c2b3e0"),
            _s("Seafoam", "#a8d8cc"), _s("Periwinkle", "#9fb0e3"), _s("Light Mauve", "#c7aebb"),
        ],
        "neutrals": [_s("Soft White", "#f3f2ee"), _s("Cool Grey", "#b6bcc2"), _s("Rose Beige", "#d4bfb6"), _s("Slate Blue", "#5f7391")],
        "accents": [_s("Raspberry", "#c8577a"), _s("Cornflower", "#7aa0dc"), _s("Sage", "#a9bfa8")],
        "compare": [_s("Orange", "#e8722c"), _s("Mustard", "#d4a017"), _s("Black", "#111111")],
        "lipstick": [_s("Rose Pink", "#d4778c"), _s("Soft Berry", "#b75f7c"), _s("Cool Nude", "#c99a9a"), _s("Dusty Rose", "#c47286")],
        "blush": [_s("Cool Pink", "#eaa7b4"), _s("Soft Rose", "#e099a8"), _s("Petal", "#f0b7bf")],
        "eyeshadow": [_s("Cool Taupe", "#b3a6a3"), _s("Soft Lilac", "#c0aed0"), _s("Grey Blue", "#8fa0b3"), _s("Pearl", "#eae4e0")],
        "hair": [_s("Ash Blonde", "#c6b193"), _s("Cool Light Brown", "#8e7a66"), _s("Mushroom Brown", "#7a6a5d"), _s("Soft Ash Brown", "#6b5c50")],
        "metals": ["White gold", "Silver", "Soft platinum"],
        "garments": {
            "indian": ["Powder-blue chiffon saree with silver work", "Lavender kurta with white palazzo", "Soft rose lehenga with pearl detail"],
            "global": ["Soft grey suit with a rose shirt", "Powder-blue knit", "Lavender midi dress"],
        },
    },
    "cool_summer": {
        "label": "Cool Summer",
        "family": "summer",
        "depth": "medium",
        "chroma": "muted",
        "contrast": "medium",
        "summary": "Clearly cool with a soft edge. Blue-based colours look natural; warmth tends to fight your skin.",
        "best": [
            _s("Cool Blue", "#5f8fc4"), _s("Rose", "#d17a94"), _s("Soft Fuchsia", "#c05e93"),
            _s("Spruce", "#4f8a80"), _s("Blue Lilac", "#8f8fd0"), _s("Cool Teal", "#3f8f9c"),
        ],
        "neutrals": [_s("Soft White", "#f2f1ee"), _s("Pewter", "#8d949c"), _s("Cocoa Grey", "#7a6d6a"), _s("Navy", "#2f4470")],
        "accents": [_s("Raspberry", "#bd3f6a"), _s("Emerald Blue", "#2f8f8a"), _s("Plum", "#77496e")],
        "compare": [_s("Tomato Red", "#e14b2c"), _s("Camel", "#c69a62"), _s("Golden Olive", "#94833a")],
        "lipstick": [_s("Cool Rose", "#c4617f"), _s("Berry", "#a8446a"), _s("Mauve", "#b0728c"), _s("Plum Pink", "#9c5273")],
        "blush": [_s("Cool Rose", "#e08fa0"), _s("Berry Pink", "#d6738f"), _s("Soft Plum", "#c07f97")],
        "eyeshadow": [_s("Slate", "#7c8894"), _s("Cool Plum", "#8a5f7d"), _s("Soft Navy", "#4f5f80"), _s("Rose Grey", "#b9a4a6")],
        "hair": [_s("Ash Brown", "#6b5a4d"), _s("Cool Chestnut", "#5a463b"), _s("Soft Espresso", "#4a3b34"), _s("Ash Auburn", "#6d4741")],
        "metals": ["Silver", "White gold", "Brushed steel"],
        "garments": {
            "indian": ["Rose-pink silk saree with silver zari", "Cool-blue chanderi kurta", "Plum lehenga with oxidised silver jewellery"],
            "global": ["Navy blazer with a rose shirt", "Cool-teal knit dress", "Grey wool coat with plum scarf"],
        },
    },
    "soft_summer": {
        "label": "Soft Summer",
        "family": "summer",
        "depth": "medium",
        "chroma": "muted",
        "contrast": "low",
        "summary": "Cool and gently greyed. Muted, blended colours suit you; very bright ones can look louder than you.",
        "best": [
            _s("Dusty Rose", "#c89099"), _s("Soft Teal", "#6d9a97"), _s("Mauve", "#a88a9c"),
            _s("Sage", "#9aa993"), _s("Denim Blue", "#6f89a8"), _s("Soft Plum", "#8a6b82"),
        ],
        "neutrals": [_s("Oyster", "#e6e0d8"), _s("Taupe Grey", "#a49b93"), _s("Cocoa", "#6f6058"), _s("Slate Navy", "#3f4f66")],
        "accents": [_s("Soft Burgundy", "#8a4a58"), _s("Pewter Blue", "#7d94a8"), _s("Moss", "#7f8a63")],
        "compare": [_s("Neon Pink", "#ff3fa4"), _s("Pure White", "#ffffff"), _s("Bright Orange", "#ff6a13")],
        "lipstick": [_s("Soft Mauve", "#b9808c"), _s("Rosewood", "#a4687a"), _s("Muted Berry", "#96546a"), _s("Dusty Nude", "#bd8f8c")],
        "blush": [_s("Dusty Rose", "#d59aa4"), _s("Soft Mauve", "#c78e9c"), _s("Muted Pink", "#dba3a8")],
        "eyeshadow": [_s("Greige", "#ada29b"), _s("Soft Teal", "#7e9a99"), _s("Muted Plum", "#8a6b7c"), _s("Stone", "#c4bcb4")],
        "hair": [_s("Ash Brown", "#6a5a4f"), _s("Mushroom", "#7b6c60"), _s("Cool Mocha", "#574840"), _s("Soft Ash Black", "#3b332f")],
        "metals": ["Brushed silver", "Matte white gold", "Oxidised silver"],
        "garments": {
            "indian": ["Dusty-rose linen saree", "Sage kurta with oxidised silver jhumkas", "Mauve chikankari set"],
            "global": ["Taupe trench over a sage knit", "Denim-blue shirt dress", "Soft plum sweater with grey trousers"],
        },
    },
    # ---------------------------------------------------------------- autumn
    "soft_autumn": {
        "label": "Soft Autumn",
        "family": "autumn",
        "depth": "medium",
        "chroma": "muted",
        "contrast": "low",
        "summary": "Warm and softened. Earthy colours with the edge taken off them suit your gentle contrast.",
        "best": [
            _s("Warm Sage", "#9aa77f"), _s("Salmon", "#dd9078"), _s("Soft Camel", "#c8a077"),
            _s("Dusty Teal", "#6f9490"), _s("Terracotta", "#c07a5c"), _s("Moss", "#8a8f5a"),
        ],
        "neutrals": [_s("Oatmeal", "#e6dac5"), _s("Warm Taupe", "#ab967d"), _s("Coffee", "#6f5a46"), _s("Deep Olive", "#5c5c3c")],
        "accents": [_s("Brick", "#b05a43"), _s("Antique Gold", "#c39a45"), _s("Teal Green", "#4f7f73")],
        "compare": [_s("Icy Blue", "#cfe4f5"), _s("Fuchsia", "#e6399b"), _s("Pure Black", "#000000")],
        "lipstick": [_s("Warm Nude", "#c08a72"), _s("Soft Brick", "#b96a56"), _s("Rosewood", "#a96f62"), _s("Muted Terracotta", "#c07a63")],
        "blush": [_s("Warm Peach", "#e5a184"), _s("Soft Terracotta", "#d78a70"), _s("Dusty Apricot", "#dfa189")],
        "eyeshadow": [_s("Warm Taupe", "#b0977f"), _s("Soft Bronze", "#b0834f"), _s("Olive", "#84864f"), _s("Cocoa", "#6d5545")],
        "hair": [_s("Golden Brown", "#7e5a34"), _s("Warm Mocha", "#5e4633"), _s("Soft Auburn", "#7d4a30"), _s("Honey Bronze", "#96703e")],
        "metals": ["Antique gold", "Matte bronze", "Brushed brass"],
        "garments": {
            "indian": ["Mehendi-green cotton saree", "Terracotta kurta with gota work", "Olive and rust bandhani dupatta"],
            "global": ["Oatmeal knit with olive trousers", "Terracotta suede jacket", "Sage shirt dress"],
        },
    },
    "warm_autumn": {
        "label": "Warm Autumn",
        "family": "autumn",
        "depth": "medium",
        "chroma": "muted",
        "contrast": "medium",
        "summary": "Unmistakably warm and rich. Spice and earth colours look made for you.",
        "best": [
            _s("Rust", "#b5542c"), _s("Pumpkin", "#d97b2b"), _s("Olive", "#77813f"),
            _s("Mustard", "#d3a127"), _s("Teal", "#2f7f79"), _s("Brick Red", "#a63c2a"),
        ],
        "neutrals": [_s("Cream", "#f2e6cd"), _s("Camel", "#c1934f"), _s("Chocolate", "#5c3f2a"), _s("Forest", "#33502f")],
        "accents": [_s("Copper", "#b26235"), _s("Deep Gold", "#c08a1e"), _s("Bronze Green", "#5f6b32")],
        "compare": [_s("Baby Pink", "#f7c7d8"), _s("Icy Grey", "#dfe4e8"), _s("Cool Fuchsia", "#d43f8d")],
        "lipstick": [_s("Brick", "#a9432f"), _s("Copper Nude", "#b5765a"), _s("Spiced Red", "#b33a26"), _s("Warm Chestnut", "#96513c")],
        "blush": [_s("Terracotta", "#d1785a"), _s("Warm Bronze", "#c07a52"), _s("Spiced Peach", "#e08f68")],
        "eyeshadow": [_s("Copper", "#b06a35"), _s("Deep Olive", "#6b7038"), _s("Warm Chocolate", "#5a3c29"), _s("Antique Gold", "#c0954a")],
        "hair": [_s("Auburn", "#8a3f22"), _s("Copper Brown", "#7c4a26"), _s("Deep Caramel", "#96682f"), _s("Chocolate Brown", "#4f3524")],
        "metals": ["Antique gold", "Copper", "Bronze"],
        "garments": {
            "indian": ["Rust Banarasi saree with antique zari", "Mustard silk kurta", "Deep-green and gold lehenga"],
            "global": ["Camel coat with a rust knit", "Olive utility jacket", "Mustard corduroy trousers"],
        },
    },
    "deep_autumn": {
        "label": "Deep Autumn",
        "family": "autumn",
        "depth": "deep",
        "chroma": "muted",
        "contrast": "high",
        "summary": "Warm and deep. Dark, saturated colours with warmth in them hold up to your natural depth.",
        "best": [
            _s("Deep Teal", "#1f5f5c"), _s("Burnt Orange", "#b4521f"), _s("Forest Green", "#2c4a2c"),
            _s("Aubergine", "#4a2b3f"), _s("Deep Gold", "#b08320"), _s("Mahogany", "#6d2f22"),
        ],
        "neutrals": [_s("Warm Ivory", "#f0e3c8"), _s("Dark Camel", "#9c7338"), _s("Espresso", "#3c2a1e"), _s("Deep Olive", "#3f4527")],
        "accents": [_s("Tomato", "#c0392b"), _s("Bronze", "#8a5a2b"), _s("Deep Turquoise", "#186f6a")],
        "compare": [_s("Pastel Pink", "#f8cfe0"), _s("Powder Blue", "#bcd8ea"), _s("Light Grey", "#d5d8db")],
        "lipstick": [_s("Brick Red", "#93301f"), _s("Deep Terracotta", "#8f4630"), _s("Warm Wine", "#7b2f36"), _s("Cinnamon", "#a55a3a")],
        "blush": [_s("Warm Brick", "#b9603f"), _s("Deep Terracotta", "#a85a3f"), _s("Bronze Rose", "#b06a55")],
        "eyeshadow": [_s("Deep Bronze", "#8a5a2a"), _s("Forest", "#33502f"), _s("Espresso", "#3b2a20"), _s("Burnished Gold", "#a8842f")],
        "hair": [_s("Dark Chocolate", "#3f2a1d"), _s("Deep Auburn", "#6b2f1c"), _s("Espresso Brown", "#33241b"), _s("Warm Black", "#241c17")],
        "metals": ["Deep yellow gold", "Antique gold", "Oxidised bronze"],
        "garments": {
            "indian": ["Deep-green Kanjeevaram with gold zari", "Maroon velvet lehenga", "Burnt-orange silk kurta with temple jewellery"],
            "global": ["Espresso leather jacket", "Forest-green suit", "Burnt-orange knit with dark denim"],
        },
    },
    # ---------------------------------------------------------------- winter
    "deep_winter": {
        "label": "Deep Winter",
        "family": "winter",
        "depth": "deep",
        "chroma": "bright",
        "contrast": "high",
        "summary": "Cool and deep. Dark, clear colours match your natural depth instead of competing with it.",
        "best": [
            _s("True Red", "#c8102e"), _s("Emerald", "#00734a"), _s("Sapphire", "#1e3f8f"),
            _s("Deep Plum", "#4a2145"), _s("Pine", "#14453b"), _s("Royal Purple", "#5b2a86"),
        ],
        "neutrals": [_s("Pure White", "#ffffff"), _s("True Black", "#111111"), _s("Charcoal", "#33373b"), _s("Navy", "#1c2b52")],
        "accents": [_s("Magenta", "#c0246f"), _s("Icy Blue", "#bcd8ea"), _s("Cool Ruby", "#9b1b36")],
        "compare": [_s("Camel", "#c69a62"), _s("Peach", "#ffb997"), _s("Mustard", "#d4a017")],
        "lipstick": [_s("True Red", "#c21f3a"), _s("Deep Berry", "#7d1f45"), _s("Cool Wine", "#6e1f33"), _s("Blue-Red", "#b01b3f")],
        "blush": [_s("Cool Berry", "#c4587a"), _s("Deep Rose", "#b04a67"), _s("Plum", "#9c4a68")],
        "eyeshadow": [_s("Charcoal", "#3a3d42"), _s("Deep Plum", "#4e2a4a"), _s("Silver Grey", "#b8bdc2"), _s("Midnight Blue", "#23305c")],
        "hair": [_s("Blue Black", "#1c1c22"), _s("Cool Dark Brown", "#33292a"), _s("Espresso", "#2a211f"), _s("Deep Burgundy", "#4a1f2a")],
        "metals": ["Silver", "White gold", "Platinum"],
        "garments": {
            "indian": ["Black and silver saree", "Royal-blue velvet lehenga", "Deep-red silk kurta with silver jewellery"],
            "global": ["Black tailored suit with a white shirt", "Emerald satin dress", "Sapphire coat"],
        },
    },
    "cool_winter": {
        "label": "Cool Winter",
        "family": "winter",
        "depth": "medium",
        "chroma": "bright",
        "contrast": "high",
        "summary": "Decisively cool and clear. Blue-based colours look crisp; warm ones tend to muddy your skin.",
        "best": [
            _s("Cool Ruby", "#b0173c"), _s("Royal Blue", "#1f4fa8"), _s("Cool Pink", "#e06a9c"),
            _s("Emerald", "#00875a"), _s("Amethyst", "#7a4fa8"), _s("Icy Mint", "#a8e0d0"),
        ],
        "neutrals": [_s("Pure White", "#ffffff"), _s("Cool Grey", "#9aa3ab"), _s("Navy", "#22346a"), _s("True Black", "#111111")],
        "accents": [_s("Fuchsia", "#d4287d"), _s("Icy Lavender", "#d5cdf0"), _s("Cool Turquoise", "#00a0b0")],
        "compare": [_s("Rust", "#b5542c"), _s("Olive", "#77813f"), _s("Golden Beige", "#d8b487")],
        "lipstick": [_s("Cool Red", "#c01f45"), _s("Fuchsia Pink", "#c93f81"), _s("Cool Berry", "#98315c"), _s("Icy Rose", "#cf6f92")],
        "blush": [_s("Cool Pink", "#e88aa8"), _s("Berry", "#cd5f86"), _s("Icy Rose", "#eb9db4")],
        "eyeshadow": [_s("Cool Taupe", "#a79fa4"), _s("Sapphire", "#25407f"), _s("Amethyst", "#6f4d90"), _s("Snow", "#eef1f4")],
        "hair": [_s("Cool Dark Brown", "#3a2e2e"), _s("Blue Black", "#1f1f26"), _s("Ash Espresso", "#332c2c"), _s("Cool Burgundy", "#57202f")],
        "metals": ["Silver", "White gold", "Platinum"],
        "garments": {
            "indian": ["Royal-blue silk saree with silver zari", "Fuchsia lehenga with mirror work", "White chikankari with cool-pink dupatta"],
            "global": ["Royal-blue shift dress", "Crisp white shirt with black trousers", "Fuchsia knit with grey wool"],
        },
    },
    "bright_winter": {
        "label": "Bright Winter",
        "family": "winter",
        "depth": "medium",
        "chroma": "bright",
        "contrast": "high",
        "summary": "Cool and vivid. Saturated, clear colours match the sharpness between your features.",
        "best": [
            _s("Hot Pink", "#ec3f8c"), _s("Electric Blue", "#1f6fe0"), _s("True Red", "#d81f3a"),
            _s("Bright Emerald", "#00a06a"), _s("Violet", "#7a3fd4"), _s("Cyan", "#00bcd4"),
        ],
        "neutrals": [_s("Pure White", "#ffffff"), _s("True Black", "#111111"), _s("Bright Navy", "#17357f"), _s("Silver Grey", "#c2c8cd")],
        "accents": [_s("Lemon Ice", "#f2f0a0"), _s("Icy Pink", "#f7cfe0"), _s("Shocking Purple", "#8f2fc0")],
        "compare": [_s("Dusty Rose", "#c39a9a"), _s("Mushroom", "#a99e94"), _s("Warm Camel", "#c69a62")],
        "lipstick": [_s("Bright Red", "#e01f3a"), _s("Hot Pink", "#e33f8f"), _s("Clear Berry", "#b02a63"), _s("Cherry", "#c8203f")],
        "blush": [_s("Bright Pink", "#f2789f"), _s("Clear Rose", "#ec6a8c"), _s("Cool Coral Pink", "#f0748c")],
        "eyeshadow": [_s("Jet", "#1f1f23"), _s("Electric Blue", "#2560cf"), _s("Icy Silver", "#dfe4e8"), _s("Clear Violet", "#7a4fc0")],
        "hair": [_s("Jet Black", "#17171c"), _s("Cool Dark Brown", "#382c2c"), _s("Blue Black", "#1c2029"), _s("Deep Cool Plum", "#4a2036")],
        "metals": ["Polished silver", "White gold", "Platinum"],
        "garments": {
            "indian": ["Hot-pink silk saree with silver border", "Electric-blue Anarkali", "Black lehenga with bright stone work"],
            "global": ["White shirt with black tailoring", "Electric-blue blazer", "True-red dress with silver jewellery"],
        },
    },
}

SEASON_KEYS: tuple[str, ...] = tuple(SEASONS)

FAMILY_SEASONS: dict[str, tuple[str, ...]] = {
    family: tuple(k for k, v in SEASONS.items() if v["family"] == family)
    for family in FAMILY_TRAITS
}
