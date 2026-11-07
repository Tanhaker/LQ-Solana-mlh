/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/liquid_pass.json`.
 */
export type LiquidPass = {
  "address": "FzUk4dbQE6PQfmMkDMcmZZ6qTPsAStY3e2Pr8aUE54Mz",
  "metadata": {
    "name": "liquidPass",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Resellable, time-bound subscription passes on Solana"
  },
  "instructions": [
    {
      "name": "buyListing",
      "docs": [
        "Resale. Price is computed on-chain from the clock; `max_price` protects",
        "the buyer. The royalty goes to the issuer and the rest to the seller, in",
        "this one transaction. Ownership moves to the buyer, expiry unchanged."
      ],
      "discriminator": [
        115,
        149,
        42,
        108,
        44,
        49,
        140,
        153
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "pass",
          "writable": true,
          "relations": [
            "listing"
          ]
        },
        {
          "name": "plan",
          "relations": [
            "pass"
          ]
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "pass"
              }
            ]
          }
        },
        {
          "name": "seller",
          "docs": [
            "listing rent; pinned by `listing.seller` and `pass.owner`."
          ],
          "writable": true,
          "relations": [
            "listing"
          ]
        },
        {
          "name": "mint",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  100,
                  99
                ]
              }
            ]
          }
        },
        {
          "name": "buyerUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "sellerUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "issuer"
        },
        {
          "name": "issuerUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "issuer"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "maxPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buyPass",
      "docs": [
        "Primary sale: buyer pays the full plan price to the issuer and receives a",
        "pass that expires `plan.duration` seconds from now."
      ],
      "discriminator": [
        57,
        144,
        218,
        182,
        67,
        42,
        234,
        124
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "plan",
          "writable": true
        },
        {
          "name": "pass",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "plan"
              },
              {
                "kind": "account",
                "path": "plan.sold",
                "account": "plan"
              }
            ]
          }
        },
        {
          "name": "mint",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  100,
                  99
                ]
              }
            ]
          }
        },
        {
          "name": "buyerUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "issuer"
        },
        {
          "name": "issuerUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "issuer"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "cancelListing",
      "discriminator": [
        41,
        183,
        50,
        232,
        230,
        233,
        157,
        70
      ],
      "accounts": [
        {
          "name": "seller",
          "writable": true,
          "signer": true,
          "relations": [
            "listing"
          ]
        },
        {
          "name": "pass",
          "writable": true,
          "relations": [
            "listing"
          ]
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "pass"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createPlan",
      "discriminator": [
        77,
        43,
        141,
        254,
        212,
        118,
        41,
        186
      ],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true
        },
        {
          "name": "plan",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "issuer"
              },
              {
                "kind": "arg",
                "path": "planId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "planId",
          "type": "u64"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "duration",
          "type": "i64"
        },
        {
          "name": "royaltyBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "faucet",
      "docs": [
        "Mints FAUCET_AMOUNT of test USDC to the caller. Devnet demo money only."
      ],
      "discriminator": [
        0,
        98,
        59,
        30,
        144,
        142,
        113,
        12
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  100,
                  99
                ]
              }
            ]
          }
        },
        {
          "name": "userUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initFaucet",
      "docs": [
        "Creates the program's test-USDC mint. Its mint authority is the mint PDA",
        "itself, so only this program's faucet can mint it."
      ],
      "discriminator": [
        122,
        64,
        137,
        151,
        7,
        139,
        100,
        57
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  100,
                  99
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "listPass",
      "docs": [
        "List a pass for resale. `opening_price` is the price at listing time; it",
        "decays linearly to zero at the pass's expiry. It may not exceed the",
        "original plan price."
      ],
      "discriminator": [
        233,
        91,
        184,
        83,
        64,
        76,
        64,
        188
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "pass"
          ]
        },
        {
          "name": "pass",
          "writable": true
        },
        {
          "name": "plan",
          "relations": [
            "pass"
          ]
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "pass"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "openingPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setPlanActive",
      "docs": [
        "Issuer can stop or resume primary sales. Existing passes are unaffected."
      ],
      "discriminator": [
        215,
        87,
        208,
        194,
        87,
        65,
        181,
        5
      ],
      "accounts": [
        {
          "name": "issuer",
          "signer": true,
          "relations": [
            "plan"
          ]
        },
        {
          "name": "plan",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "active",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setPlanMetadata",
      "docs": [
        "Issuer attaches or replaces the plan's public metadata: an `ipfs://`",
        "link to a JSON file (description, logo) pinned on IPFS. Kept in its own",
        "account so plans created before this instruction existed are unchanged."
      ],
      "discriminator": [
        113,
        215,
        38,
        226,
        89,
        82,
        33,
        145
      ],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true,
          "relations": [
            "plan"
          ]
        },
        {
          "name": "plan"
        },
        {
          "name": "meta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "plan"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "uri",
          "type": "string"
        }
      ]
    },
    {
      "name": "transferPass",
      "docs": [
        "Gift a pass. The expiry does not change."
      ],
      "discriminator": [
        171,
        41,
        222,
        19,
        98,
        43,
        65,
        14
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "pass"
          ]
        },
        {
          "name": "pass",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "newOwner",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "listing",
      "discriminator": [
        218,
        32,
        50,
        73,
        43,
        134,
        26,
        58
      ]
    },
    {
      "name": "pass",
      "discriminator": [
        40,
        247,
        140,
        113,
        56,
        14,
        57,
        44
      ]
    },
    {
      "name": "plan",
      "discriminator": [
        161,
        231,
        251,
        119,
        2,
        12,
        162,
        2
      ]
    },
    {
      "name": "planMeta",
      "discriminator": [
        67,
        22,
        241,
        37,
        43,
        69,
        35,
        80
      ]
    }
  ],
  "events": [
    {
      "name": "passPurchased",
      "discriminator": [
        11,
        171,
        162,
        118,
        129,
        168,
        151,
        90
      ]
    },
    {
      "name": "passResold",
      "discriminator": [
        132,
        216,
        164,
        209,
        159,
        99,
        168,
        247
      ]
    },
    {
      "name": "planMetadataSet",
      "discriminator": [
        30,
        146,
        111,
        123,
        205,
        18,
        253,
        33
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidName",
      "msg": "Plan name must be 1-32 characters"
    },
    {
      "code": 6001,
      "name": "invalidPrice",
      "msg": "Price must be greater than zero"
    },
    {
      "code": 6002,
      "name": "invalidDuration",
      "msg": "Duration must be between 1 minute and 366 days"
    },
    {
      "code": 6003,
      "name": "invalidRoyalty",
      "msg": "Royalty may not exceed 50%"
    },
    {
      "code": 6004,
      "name": "planInactive",
      "msg": "This plan is not on sale"
    },
    {
      "code": 6005,
      "name": "notIssuer",
      "msg": "Only the plan's issuer can do this"
    },
    {
      "code": 6006,
      "name": "notOwner",
      "msg": "Only the pass owner can do this"
    },
    {
      "code": 6007,
      "name": "passListed",
      "msg": "The pass is listed for sale"
    },
    {
      "code": 6008,
      "name": "notListed",
      "msg": "The pass is not listed for sale"
    },
    {
      "code": 6009,
      "name": "passExpired",
      "msg": "The pass has expired"
    },
    {
      "code": 6010,
      "name": "sameOwner",
      "msg": "The new owner must be a different wallet"
    },
    {
      "code": 6011,
      "name": "issuerCannotHold",
      "msg": "The issuer cannot hold its own plan's passes"
    },
    {
      "code": 6012,
      "name": "aboveRetail",
      "msg": "Listing price may not exceed the original plan price"
    },
    {
      "code": 6013,
      "name": "priceAboveMax",
      "msg": "Current price is above your maximum"
    },
    {
      "code": 6014,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6015,
      "name": "invalidUri",
      "msg": "Metadata must be an ipfs:// link to a CID"
    }
  ],
  "types": [
    {
      "name": "listing",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pass",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "openingPrice",
            "type": "u64"
          },
          {
            "name": "listedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "pass",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "number",
            "docs": [
              "0-based pass number within its plan."
            ],
            "type": "u64"
          },
          {
            "name": "purchasedAt",
            "type": "i64"
          },
          {
            "name": "expiry",
            "type": "i64"
          },
          {
            "name": "listed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "passPurchased",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pass",
            "type": "pubkey"
          },
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "expiry",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "passResold",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pass",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "royalty",
            "type": "u64"
          },
          {
            "name": "expiry",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "plan",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "planId",
            "type": "u64"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "price",
            "docs": [
              "Price in test-USDC base units (6 decimals)."
            ],
            "type": "u64"
          },
          {
            "name": "duration",
            "docs": [
              "Pass length in seconds."
            ],
            "type": "i64"
          },
          {
            "name": "royaltyBps",
            "type": "u16"
          },
          {
            "name": "sold",
            "type": "u64"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "planMeta",
      "docs": [
        "Public metadata for a plan, at PDA `[b\"meta\", plan]`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "uri",
            "docs": [
              "`ipfs://<cid>` of a JSON file: { name, description, image }."
            ],
            "type": "string"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "planMetadataSet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "uri",
            "type": "string"
          }
        ]
      }
    }
  ]
};
