## Yu-Gi-Oh! API by YGOPRODeck

You can **support** our free Yu-Gi-Oh! API by purchasing a subscription to [YGOPRODeck Premium](https://db.ygoprodeck.com/premium/).

This is currently the latest API version **(v7)**.

**NOTE ON IMAGES: Do not continually hotlink images directly from this site. Please download and re-host the images yourself. Failure to do so will result in an IP blacklist. Please read this guide on where to download images.**

**Upgrade Note:** Please read through the documentation before upgrading to v7. Your code will not work if you simply change th endpoint to v7, please read the documentation below.

Older Versions

- All older versions of the API are now deprecated.

**API Changelog v7 (last update 22nd September 2025):**

- `genesys_points` is now returned when format of `genesys` is passed.

Our Yu-Gi-Oh! API is now available for public consumption. Below are the details on how to use the API and what kind of response is to be expected from the API.

**Please download and store all data pulled from this API locally** to keep the amount of API calls used to a minimum. Failure to do so may result in either your IP address being blacklisted or the API being rolled back.

**Rate Limiting** on the API is enabled. The rate limit is **20 requests per 1 second**. If you exceed this, you are blocked from accessing the API for 1 hour. We will monitor this rate limit for now and adjust accordingly.

Our API responses are cached on **our side**. The cache timings will be given below. These are subject to change.

![](https://ygoprodeck.com/wp-content/uploads/2018/11/Adblock_Plus_2014_Logo.svg.png)

#### Get Card Information

The Card Information endpoint is available at `https://db.ygoprodeck.com/api/v7/cardinfo.php`

This is the only endpoint that is now needed. You can pass multiple paramters to this endpoint to filter the information retrieved.

The following endpoint parameters can be passed:

- name - The **exact** name of the card. You can pass multiple `|` separated names to this parameter (`Baby Dragon|Time Wizard`).
- fname - A fuzzy search using a string. For example `&fname=Magician` to search by all cards with "Magician" in the name.
- id - The 8-digit passcode of the card. You **cannot** pass this alongside name. You can pass multiple comma separated IDs to this parameter.
- konami\_id - The Konami ID of the card. **This is not the passcode**.
- type - The type of card you want to filter by. See below "Card Types Returned" to see all available types. You can pass multiple comma separated Types to this parameter.
- atk - Filter by atk value.
- def - Filter by def value.
- level - Filter by card level/RANK.
- race - Filter by the card race which is officially called type (Spellcaster, Warrior, Insect, etc). This is also used for Spell/Trap cards (see below). You can pass multiple comma separated Races to this parameter.
- attribute - Filter by the card attribute. You can pass multiple comma separated Attributes to this parameter.
- link - Filter the cards by Link value.
- linkmarker - Filter the cards by Link Marker value (Top, Bottom, Left, Right, Bottom-Left, Bottom-Right, Top-Left, Top-Right). You can pass multiple comma separated values to this parameter (see examples below).
- scale - Filter the cards by Pendulum Scale value.
- cardset - Filter the cards by card set (Metal Raiders, Soul Fusion, etc).
- archetype - Filter the cards by archetype (Dark Magician, Prank-Kids, Blue-Eyes, etc).
- banlist - Filter the cards by banlist (TCG, OCG, Goat).
- sort - Sort the order of the cards (atk, def, name, type, level, id, new).
- format - Sort the format of the cards (tcg, goat, ocg goat, speed duel, master duel, rush duel, duel links, genesys). Note: Duel Links is not 100% accurate but is close. Using tcg results in all cards with a set TCG Release Date and excludes Speed Duel/Rush Duel cards.
- misc - Pass `yes` to show additional response info ([details](#misc-info)).
- staple - Check if card is a [staple](https://db.ygoprodeck.com/search/?&type=Staple).
- has\_effect - Check if a card actually has an effect or not by passing a boolean true/false. Examples of cards that do not have an actual effect: Black Skull Dragon, LANphorhynchus, etc etc.
- startdate, enddate and dateregion - Filter based on cards' release date. Format dates as `YYYY-mm-dd`. Pass `dateregion` as `tcg` *(default)* or `ocg`.

You can also use the following equation symbols for **atk**, **def** and **level**:  
"lt" (less than), "lte" (less than equals to), "gt" (greater than), "gte" (greater than equals to).

Examples: atk=lt2500 (atk is less than 2500), def=gte2000 (def is greater than or equal to 2000) and level=lte8 (level is less than or equal to 8).

The specific results from this endpoint are cached for **2 days (172800 seconds)** but will be manually cleared upon new card entry.

**Response Information:**

All Cards

- id - ID or Passcode of the card.
- name - Name of the card.
- type - The type of card you are viewing (Normal Monster, Effect Monster, Synchro Monster, Spell Card, Trap Card, etc.).
- frameType - The backdrop type that this card uses (normal, effect, synchro, spell, trap, etc.).
- desc - Card description/effect.
- ygoprodeck\_url - Link to YGOPRODeck card page.

Monster Cards

- atk - The ATK value of the card.
- def - The DEF value of the card.
- level - The Level/RANK of the card.
- race - The card race which is officially called type (Spellcaster, Warrior, Insect, etc).
- attribute - The attribute of the card.

Spell/Trap Cards

- race - The card race which is officially called type for Spell/Trap Cards (Field, Equip, Counter, etc).

Card Archetype

- archetype - The Archetype that the card belongs to. We take feedback on Archetypes [here](https://github.com/AlanOC91/YGOPRODeck/issues/10).

Additional Response for Pendulum Monsters

- scale - The Pendulum Scale Value.

Additional Response for Link Monsters

- linkval - The Link Value of the card if it's of type "Link Monster".
- linkmarkers - The Link Markers of the card if it's of type "Link Monster". This information is returned as an array.

Card Sets

- You can now optionally use `tcgplayer_data` parameter. Using this will replace our internal Card Set data with TCGplayer Card Set Data.
- **NOTE:** If using `tcgplayer_data`, we cannot guarantee that Set Names, Rairites and other info are correct. TCGplayer have occasionally made up Rarity names in the past and don't always conform to correct Card Set Names. A prime example of this is "Legend of Blue Eyes White Dragon" which TCGplayer lists as "The Legend of Blue Eyes White Dragon".
- A Card Sets array is now returned as of v5. card\_sets
- The array holds each set the card is found in. Each set contains the following info: set\_name, set\_code, set\_rarity, set\_price.
- If using `tcgplayer_data`, the API will also return `set_edition` and `set_url`.
- set\_price is the $ value.

Card Images

- A Card Images array is now returned as of v5. card\_images
- The array holds each image/alt artwork image along with the Card ID. Each set contains the following info: id, image\_url, image\_url\_small, image\_url\_cropped.
- Take this example: `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Decode%20Talker`
- It contains two sets of Card IDs/Images within the card\_images array. This is for the default artwork and the additional alternative artwork.

Card Prices

- A Card Prices array is now returned as of v5. card\_prices
- The array holds card prices from multiple vendors. **This is the lowest price found across multiple versions of that card**.
- cardmarket\_price - The price of the card from Cardmarket (in €).
- coolstuffinc\_price - The price of the card from CoolStuffInc (in $).
- tcgplayer\_price - The price of the card from Tcgplayer (in $).
- ebay\_price - The price of the card from eBay (in $).
- amazon\_price - The price of the card from Amazon (in $).

Banlist Info

- A Banlist Info array is now returned as of v5. banlist\_info
- The array holds banlist information for that card.
- ban\_tcg - The status of the card on the TCG Ban List.
- ban\_ocg - The status of the card on the OCG Ban List.
- ban\_goat - The status of the card on the [GOAT Format](https://ygoprodeck.com/an-introduction-to-goat-format/) Ban List.

Additional information returned for `misc=yes`:

- beta\_name - The Old/Temporary/Translated name the card had.
- views - The number of times a card has been viewed in our database (does not include API/external views).
- viewsweek - The number of times a card has been viewed in our database this week (does not include API/external views).
- upvotes - The number of upvotes a card has.
- downvotes - The number of downvotes a card has.
- formats - The available formats the card is in (tcg, ocg, master duel, goat, ocg goat, duel links, rush duel or speed duel).
- treated\_as - If the card is treated as another card. For example, Harpie Lady 1,2,3 are treated as Harpie Lady.
- tcg\_date - The original date the card was released in the TCG.
- ocg\_date - The original date the card was released in the OCG.
- konami\_id - The card's Konami ID, if available
- md\_rarity - The card's rarity in Master Duel, if available
- has\_effect - If the card has an actual text effect. 1 means true and 0 is false. Examples of cards that do not have an actual effect (false/0): Black Skull Dragon, LANphorhynchus, etc etc.
- genesys\_points (when format = genesys) - The genesys format points code. Most cards are 0 unless otherwise stated.

**If a piece of response info is empty or null then it will NOT show up. For example, Link Monsters have no DEF, Level or Scale value so those values will not be returned.**

```
{
  "data": [
    {
      "id": 6983839,
      "name": "Tornado Dragon",
      "type": "XYZ Monster",
      "frameType": "xyz",
      "desc": "2 Level 4 monsters\nOnce per turn (Quick Effect): You can detach 1 material from this card, then target 1 Spell/Trap on the field; destroy it.",
      "atk": 2100,
      "def": 2000,
      "level": 4,
      "race": "Wyrm",
      "attribute": "WIND",
      "card_sets": [
        {
          "set_name": "Battles of Legend: Relentless Revenge",
          "set_code": "BLRR-EN084",
          "set_rarity": "Secret Rare",
          "set_rarity_code": "(ScR)",
          "set_price": "4.08"
        },
        {
          "set_name": "Duel Devastator",
          "set_code": "DUDE-EN019",
          "set_rarity": "Ultra Rare",
          "set_rarity_code": "(UR)",
          "set_price": "1.4"
        },
        {
          "set_name": "Maximum Crisis",
          "set_code": "MACR-EN081",
          "set_rarity": "Secret Rare",
          "set_rarity_code": "(ScR)",
          "set_price": "4.32"
        }
      ],
      "card_images": [
        {
          "id": 6983839,
          "image_url": "https://images.ygoprodeck.com/images/cards/6983839.jpg",
          "image_url_small": "https://images.ygoprodeck.com/images/cards_small/6983839.jpg",
          "image_url_cropped": "https://images.ygoprodeck.com/images/cards_cropped/6983839.jpg"
        }
      ],
      "card_prices": [
        {
          "cardmarket_price": "0.42",
          "tcgplayer_price": "0.48",
          "ebay_price": "2.99",
          "amazon_price": "0.77",
          "coolstuffinc_price": "0.99"
        }
      ]
    }
  ]
}
```

[Tornado Dragon](https://db.ygoprodeck.com/card/?search=Tornado%20Dragon) API response  
```
https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Tornado%20Dragon
```

#### Example Usage

The following is a list of examples you can do using the possible endpoint parameters shown above.

- Get all cards
	`https://db.ygoprodeck.com/api/v7/cardinfo.php`
- Get "Dark Magician" card information
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Dark Magician`
- Get all cards belonging to "Blue-Eyes" archetype
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?archetype=Blue-Eyes`
- Get all Level 4/RANK 4 Water cards and order by atk
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?level=4&attribute=water&sort=atk`
- Get all cards on the TCG Banlist who are level 4 and order them by name (A-Z)
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?banlist=tcg&level=4&sort=name`
- Get all Dark attribute monsters from the Metal Raiders set
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=metal%20raiders&attribute=dark`
- Get all cards with "Wizard" in their name who are LIGHT attribute monsters with a race of Spellcaster
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=Wizard&attribute=light&race=spellcaster`
- Get all Spell Cards that are Equip Spell Cards
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?type=spell%20card&race=equip`
- Get all Speed Duel Format Cards
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?format=Speed Duel`
- Get all Rush Duel Format Cards
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?format=Rush%20Duel`
- Get all Water Link Monsters who have Link Markers of "Top" and "Bottom"
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?attribute=water&type=Link%20Monster&linkmarker=top,bottom`
- Get Card Information while also using the misc parameter
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Tornado%20Dragon&misc=yes`
- Get all cards considered Staples
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?staple=yes`
- Get all TCG cards released between 1st Jan 2000 and 23rd August 2002
	`https://db.ygoprodeck.com/api/v7/cardinfo.php?&startdate=2000-01-01&enddate=2002-08-23&dateregion=tcg`

```
[
  {
    "set_name": "2-Player Starter Deck: Yuya & Declan",
    "set_code": "YS15",
    "num_of_cards": 42,
    "tcg_date": "2015-05-28"
  },
  {
    "set_name": "2013 Collectible Tins Wave 1",
    "set_code": "CT10",
    "num_of_cards": 9,
    "tcg_date": "2013-08-30"
  },
  {
    "set_name": "2013 Collectible Tins Wave 2",
    "set_code": "CT10",
    "num_of_cards": 9,
    "tcg_date": "2013-11-22"
  },
  {
    "set_name": "2014 Mega-Tin Mega Pack",
    "set_code": "MP14",
    "num_of_cards": 246,
    "tcg_date": "2014-08-28"
  },
  {
    "set_name": "2014 Mega-Tins",
    "set_code": "CT11",
    "num_of_cards": 6,
    "tcg_date": "2014-08-28"
  },
  {
    "set_name": "2015 Mega-Tin Mega Pack",
    "set_code": "MP15",
    "num_of_cards": 247,
    "tcg_date": "2015-09-17"
  },
  {
    "set_name": "2015 Mega-Tins",
    "set_code": "CT12",
    "num_of_cards": 6,
    "tcg_date": "2015-09-17"
  },
  {
    "set_name": "2016 Mega-Tin Mega Pack",
    "set_code": "MP16",
    "num_of_cards": 239,
    "tcg_date": "2016-09-01"
  },
  {
    "set_name": "2016 Mega-Tins",
    "set_code": "CT13",
    "num_of_cards": 12,
    "tcg_date": "2016-09-01"
  },
  {
    "set_name": "2017 Mega-Tin Mega Pack",
    "set_code": "MP17",
    "num_of_cards": 239,
    "tcg_date": "2017-08-24"
  },
  {
    "set_name": "2017 Mega-Tins",
    "set_code": "CT14",
    "num_of_cards": 8,
    "tcg_date": "2017-08-24"
  },
  {
    "set_name": "2018 Mega-Tin Mega Pack",
    "set_code": "MP18",
    "num_of_cards": 233,
    "tcg_date": "2018-08-30"
  },
  {
    "set_name": "2018 Mega-Tins",
    "set_code": "CT15",
    "num_of_cards": 10,
    "tcg_date": "2018-08-30"
  }
]
```

Portion of Card Sets API  
```
https://db.ygoprodeck.com/api/v7/cardsets.php
```

#### Endpoint Information

**Parameter `race` values:**

**Monster Cards**

- Aqua
- Beast
- Beast-Warrior
- Creator-God
- Cyberse
- Dinosaur
- Divine-Beast
- Dragon
- Fairy
- Fiend
- Fish
- Insect
- Machine
- Plant
- Psychic
- Pyro
- Reptile
- Rock
- Sea Serpent
- Spellcaster
- Thunder
- Warrior
- Winged Beast
- Wyrm
- Zombie

**Spell Cards**

- Normal
- Field
- Equip
- Continuous
- Quick-Play
- Ritual

**Trap Cards**

- Normal
- Continuous
- Counter

**Parameter `type` values:**

**Main Deck Types**

- "Effect Monster"
- "Flip Effect Monster"
- "Flip Tuner Effect Monster"
- "Gemini Monster"
- "Normal Monster"
- "Normal Tuner Monster"
- "Pendulum Effect Monster"
- "Pendulum Effect Ritual Monster"
- "Pendulum Flip Effect Monster"
- "Pendulum Normal Monster"
- "Pendulum Tuner Effect Monster"
- "Ritual Effect Monster"
- "Ritual Monster"
- "Spell Card"
- "Spirit Monster"
- "Toon Monster"
- "Trap Card"
- "Tuner Monster"
- "Union Effect Monster"

**Extra Deck Types**

- "Fusion Monster"
- "Link Monster"
- "Pendulum Effect Fusion Monster"
- "Synchro Monster"
- "Synchro Pendulum Effect Monster"
- "Synchro Tuner Monster"
- "XYZ Monster"
- "XYZ Pendulum Effect Monster"

**Other Types**

- "Skill Card"
- "Token"

**Parameter `frameType` values:**

- `normal`
- `effect`
- `ritual`
- `fusion`
- `synchro`
- `xyz`
- `link`
- `normal_pendulum`
- `effect_pendulum`
- `ritual_pendulum`
- `fusion_pendulum`
- `synchro_pendulum`
- `xyz_pendulum`
- `spell`
- `trap`
- `token`
- `skill`

```
{
  "data": [
    {
      "id": 23771716,
      "name": "7 Colored Fish",
      "type": "Normal Monster",
      "frameType": "normal",
      "desc": "A rare rainbow fish that has never been caught by mortal man.",
      "atk": 1800,
      "def": 800,
      "level": 4,
      "race": "Fish",
      "attribute": "WATER",
      "card_sets": [
        {
          "set_name": "Gold Series",
          "set_code": "GLD1-EN001",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "0.74"
        },
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-098",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "1.06"
        },
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-E098",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "2.63"
        },
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-EN098",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "2.95"
        },
        {
          "set_name": "Starter Deck: Joey",
          "set_code": "SDJ-008",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "1.02"
        },
        {
          "set_name": "Structure Deck: Fury from the Deep",
          "set_code": "SD4-EN002",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "1.12"
        }
      ],
      "card_images": [
        {
          "id": 23771716,
          "image_url": "https://images.ygoprodeck.com/images/cards/23771716.jpg",
          "image_url_small": "https://images.ygoprodeck.com/images/cards_small/23771716.jpg",
          "image_url_cropped": "https://images.ygoprodeck.com/images/cards_cropped/23771716.jpg"
        }
      ],
      "card_prices": [
        {
          "cardmarket_price": "0.07",
          "tcgplayer_price": "0.23",
          "ebay_price": "1.75",
          "amazon_price": "0.25",
          "coolstuffinc_price": "0.25"
        }
      ]
    },
    {
      "id": 42431843,
      "name": "Ancient Brain",
      "type": "Normal Monster",
      "frameType": "normal",
      "desc": "A fallen fairy that is powerful in the dark.",
      "atk": 1000,
      "def": 700,
      "level": 3,
      "race": "Fiend",
      "attribute": "DARK",
      "card_sets": [
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-082",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "1.03"
        },
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-E082",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "13.17"
        },
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-EN082",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "2.95"
        },
        {
          "set_name": "Speed Duel: Trials of the Kingdom",
          "set_code": "SBTK-EN004",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "0.96"
        }
      ],
      "card_images": [
        {
          "id": 42431843,
          "image_url": "https://images.ygoprodeck.com/images/cards/42431843.jpg",
          "image_url_small": "https://images.ygoprodeck.com/images/cards_small/42431843.jpg"
        }
      ],
      "card_prices": [
        {
          "cardmarket_price": "0.09",
          "tcgplayer_price": "0.13",
          "ebay_price": "6.49",
          "amazon_price": "1.28",
          "coolstuffinc_price": "0.25"
        }
      ]
    },
    {
      "id": 93221206,
      "name": "Ancient Elf",
      "type": "Normal Monster",
      "frameType": "normal",
      "desc": "This elf is rumored to have lived for thousands of years. He leads an army of spirits against his enemies.",
      "atk": 1450,
      "def": 1200,
      "level": 4,
      "race": "Spellcaster",
      "attribute": "LIGHT",
      "card_sets": [
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-037",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "1.07"
        },
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-E037",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "9.17"
        },
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-EN037",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "0.00"
        },
        {
          "set_name": "Starter Deck: Yugi",
          "set_code": "SDY-024",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "1.01"
        },
        {
          "set_name": "Starter Deck: Yugi",
          "set_code": "SDY-E022",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "23.28"
        }
      ],
      "card_images": [
        {
          "id": 93221206,
          "image_url": "https://images.ygoprodeck.com/images/cards/93221206.jpg",
          "image_url_small": "https://images.ygoprodeck.com/images/cards_small/93221206.jpg",
          "image_url_cropped": "https://images.ygoprodeck.com/images/cards_cropped/93221206.jpg"
        }
      ],
      "card_prices": [
        {
          "cardmarket_price": "0.03",
          "tcgplayer_price": "0.20",
          "ebay_price": "0.99",
          "amazon_price": "0.68",
          "coolstuffinc_price": "0.25"
        }
      ]
    },
    {
      "id": 43230671,
      "name": "Ancient Lizard Warrior",
      "type": "Normal Monster",
      "frameType": "normal",
      "desc": "Before the dawn of man, this lizard warrior ruled supreme.",
      "atk": 1400,
      "def": 1100,
      "level": 4,
      "race": "Reptile",
      "attribute": "EARTH",
      "card_sets": [
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-050",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "0.95"
        },
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-E050",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "9.74"
        },
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-EN050",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "1.72"
        }
      ],
      "card_images": [
        {
          "id": 43230671,
          "image_url": "https://images.ygoprodeck.com/images/cards/43230671.jpg",
          "image_url_small": "https://images.ygoprodeck.com/images/cards_small/43230671.jpg",
          "image_url_cropped": "https://images.ygoprodeck.com/images/cards_cropped/43230671.jpg"
        }
      ],
      "card_prices": [
        {
          "cardmarket_price": "0.16",
          "tcgplayer_price": "0.17",
          "ebay_price": "0.99",
          "amazon_price": "0.80",
          "coolstuffinc_price": "0.25"
        }
      ]
    },
    {
      "id": 15480588,
      "name": "Armored Lizard",
      "type": "Normal Monster",
      "frameType": "normal",
      "desc": "A lizard with a very tough hide and a vicious bite.",
      "atk": 1500,
      "def": 1200,
      "level": 4,
      "race": "Reptile",
      "attribute": "EARTH",
      "card_sets": [
        {
          "set_name": "Dark Beginning 1",
          "set_code": "DB1-EN143",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "1.01"
        },
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-005",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "0.96"
        },
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-E005",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "4.89"
        },
        {
          "set_name": "Metal Raiders",
          "set_code": "MRD-EN005",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "2.95"
        },
        {
          "set_name": "Starter Deck: Joey",
          "set_code": "SDJ-009",
          "set_rarity": "Common",
          "set_rarity_code": "(C)",
          "set_price": "0.98"
        }
      ],
      "card_images": [
        {
          "id": 15480588,
          "image_url": "https://images.ygoprodeck.com/images/cards/15480588.jpg",
          "image_url_small": "https://images.ygoprodeck.com/images/cards_small/15480588.jpg",
          "image_url_cropped": "https://images.ygoprodeck.com/images/cards_cropped/15480588.jpg"
        }
      ],
      "card_prices": [
        {
          "cardmarket_price": "0.09",
          "tcgplayer_price": "0.13",
          "ebay_price": "0.99",
          "amazon_price": "0.69",
          "coolstuffinc_price": "0.25"
        }
      ]
    }
  ],
  "meta": {
    "current_rows": 5,
    "total_rows": 144,
    "rows_remaining": 139,
    "total_pages": 28,
    "pages_remaining": 28,
    "next_page": "https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=metal+raiders&num=5&offset=5",
    "next_page_offset": 5
  }
}
```

Limited number of [Metal Raiders](https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=metal%20raiders&num=5&offset=0) API response  
```
https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=metal%20raiders&num=5&offset=0
```

#### Endpoint Languages

We offer the API in the following langugaes: English, French, German, Portuguese and Italian.

Card images are **only stored in English**.

Newly revealed cards leaked from Japan are available only in **English** until the official translation is released.

There are a handful of cards which may not have a translation yet but each language contains over 9000 cards translated. You can reach out to us on [Github](https://github.com/AlanOC91/YGOPRODeck/issues) to report any translation misses/issues.

Languages can only be queried on `cardinfo.php` and must be passed with `&language=` along with the language code.

The language codes are: `fr` for French, `de` for German, `it` for Italian and `pt` for Portuguese.

Language Examples:

[Survival of the Fittest](https://db.ygoprodeck.com/card/?search=Survival%20of%20the%20Fittest) in French

- `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Survie%20du%20Plus%20Fort&language=fr`

Get the 5 latest cards in German

- `https://db.ygoprodeck.com/api/v7/cardinfo.php?language=de&num=5&offset=0&sort=new`

Get all French cards with "Temps" in the name

- `https://db.ygoprodeck.com/api/v7/cardinfo.php?language=fr&fname=Temps`

Get all Portuguese cards from the Blue-Eyes archetype

- `https://db.ygoprodeck.com/api/v7/cardinfo.php?language=pt&archetype=Blue-Eyes`

![](https://ygoprodeck.com/wp-content/uploads/2020/07/French-Time-Wizard.png)

#### Card Images

**Images are pulled from our image server `images.ygoprodeck.com`. **You must download and store these images yourself!****

Please only pull an image **once** and then store it locally. If we find you are pulling a very high volume of images per second then your IP will be blacklisted and blocked.

Our card images are in `.jpg` format and are web optimized.

All of our cloud URLs will either be `https://images.ygoprodeck.com/images/cards/` (full size images), `https://images.ygoprodeck.com/images/cards_small/` (small size images) or `https://images.ygoprodeck.com/images/cards_cropped/` (cropped image art). You pass the ID of the card to retrieve the image.

Example Limit Reverse Card Image: `https://images.ygoprodeck.com/images/cards/27551.jpg`

The image URLs are found within the JSON response as `image_url`, `image_url_small`, and `image_url_cropped`, all within the `card_images` array.

Alternative artwork (if available) will also be listed within the `card_images` array.

Since v3: Card images are now properly returned without slashes being incorrectly escaped as it was with v2.

![](https://images.ygoprodeck.com/images/cards/58775978.jpg)

#### Random Card

The Random Card endpoint can be found at `https://db.ygoprodeck.com/api/v7/randomcard.php`.

This follows the same rate limiting procedures as the card lookup endpoint.

Cache Control is disabled for this endpoint so it should always provide a fresh card.

If any GET parameters are found in the call, then it will return an error.

#### All Card Sets

The Card Sets endpoint can be found at `https://db.ygoprodeck.com/api/v7/cardsets.php`.

This follows the same rate limiting procedures as the card lookup endpoint.

This simply returns all of the current Yu-Gi-Oh! Card Set Names we have stored in the database.

This contains the following response info: Set Name, Set Code, Number of Cards and TCG Date (Release Date).

Use this to get a quick snapshot of all the Yu-Gi-Oh! Card Sets sorted by A-Z.

If any GET parameters are found in the call, then it will return an error.

#### Card Set Information

The Card Sets Information endpoint can be found at `https://db.ygoprodeck.com/api/v7/cardsetsinfo.php`.

This **requires** a parameter of "setcode".

Example usage: `https://db.ygoprodeck.com/api/v7/cardsetsinfo.php?setcode=SDY-046`

This follows the same rate limiting procedures as the card lookup endpoint.

This returns the following information: id, name, set\_name, set\_code, set\_rarity and set\_price (in $).

If no (or invalid) GET parameters are found in the call, then it will return an error.

#### All Card Archetypes

The Card Archetypes endpoint can be found at `https://db.ygoprodeck.com/api/v7/archetypes.php`.

This follows the same rate limiting procedures as the card lookup endpoint.

This simply returns all of the current Yu-Gi-Oh! Card Archetype Names we have stored in the database.

Use this to get a quick snapshot of all the Yu-Gi-Oh! Card Archtypes sorted by A-Z.

If any GET parameters are found in the call, then it will return an error.

#### Check Database Version

The Card Database Version endpoint can be found at `https://db.ygoprodeck.com/api/v7/checkDBVer.php`.

This follows the same rate limiting procedures as the card lookup endpoint.

This is not a cached endpoint and database\_version and date are incremented when:

- New card is added to the database.
- Card information is updated/modified on the main database.

If any GET parameters are found in the call, then it will return an error.

#### Error Checking

The main features of v3 is more thorough error checking.

All error codes now return a correct 400 response header.

Almost every parameter will now return an error code if an invalid value is passed to it (as opposed to ignoring it and returning all cards like in previous versions). The user will also be prompted on all the correct possible values to pass so they aren't left guessing.

Here is an example of an invalid value sent through the attribute parameter: `https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Effect%20Monster&attribute=wood&num=2`

The response returned: `{"error":"Attribute value of wood is invalid. Please use a correct attribute value. Attribute accepts 'dark', 'earth', 'fire', 'light', 'water', 'wind' or 'divine' and is not case sensitive."}`

The only way to return all cards now is by having 0 parameters in the request: `https://db.ygoprodeck.com/api/v7/cardinfo.php`. If invalid parameters are sent, an error will also be returned.

This should save users bandwidth on receiving large requests when requesting malformed urls.

```
{
    error: "Attribute value of wood is invalid. Please use a correct attribute value. Attribute accepts 'dark', 'earth', 'fire', 'light', 'water', 'wind' or 'divine' and is not case sensitive."
}
```

Invalid Value passed to API (Wood)  
```
https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Effect%20Monster&attribute=wood&num=2
```

#### API Showcase

One of the main sites using this API is the site you are currently on! We use this very API on [Card Information pages](https://db.ygoprodeck.com/card/?search=Time%20Wizard), our [Advanced Search](https://db.ygoprodeck.com/search/?&num=30&offset=0&view=List) and on our [Deck Builder](https://ygoprodeck.com/card-database/deck-prices/).

The following is a list of sites/services that make use of our API and have allowed us to showcase them. Check them out!

- [Yu-Gi-Oh! Discord Bot](https://db.ygoprodeck.com/bots/)
- A Yu-Gi-Oh! Discord bot from YGOPRODeck for retrieving Card Information.
- [Duel Links Meta Website](https://www.duellinksmeta.com/)
- A Website dedicated to Yu-Gi-Oh! Duel Links.
- [Yugiohdeck](https://yugiohdeck.github.io/)
- A Yu-Gi-Oh! Deck Viewing/Pricing Website.
- [YCM (Yugi-Calculator-MAX)](https://ycm.netlify.app/calc)
- A Yu-Gi-Oh! Mobile Deck Building/Calculator App.
- [Duelist](https://play.google.com/store/apps/details?id=com.zurdo.duelist)
- A Yu-Gi-Oh! Android Application for Building Decks.
- [Yu-Gi-Oh! Tracker](http://yugiohtracker.com/)
- A Yu-Gi-Oh! Card Search Website.
- [Anime Card Maker](https://www.aygocm.co.uk/)
- A PC program that allows you to create anime-styled Yu-Gi-Oh! cards.
- [YGO Progression Discord Bot](https://github.com/EMachad0/YGO-Progression-Bot)
- A Discord Bot that allows you to run a Yu-Gi-Oh! progression series.
- [Autocard Anywhere](https://autocardanywhere.com/)
- A Browser Addon that automatically converts card names on web pages to card information links.

#### Credits

- Credit to all the people who contribute/offer suggestions over on our [github](https://github.com/AlanOC91/YGOPRODeck/issues).
- Credit to the Duelists Unite team for the cropped artwork images.