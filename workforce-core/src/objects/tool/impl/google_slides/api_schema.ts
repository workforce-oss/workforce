const schema = {
    "openapi": "3.0.0",
    "info": {
        "title": "Google Slides",
        "description": "Google Slides API",
        "version": "1.0.0"
    },
    "security": [
        {
            "oauth2": [
                "https://www.googleapis.com/auth/drive.file",
            ]
        }
    ],
    "servers": [
        {
            "url": "https://slides.googleapis.com/v1"
        }
    ],
    "paths": {
        "/presentations/{presentationId}": {
            "description": "Get a presentation. Use the 'id' property to identify the presentation.",
            "get": {
                "description": "Get a presentation by ID.",
                "summary": "GetPresentation",
                "operationId": "getPresentation",
                "parameters": [
                    {
                        "name": "presentationId",
                        "in": "path",
                        "description": "The Presentation ID",
                        "required": true,
                        "schema": {
                            "type": "string"
                        }
                    },
                ],
                "responses": {
                    "200": {
                        "description": "A presentation",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object"
                                }
                            }
                        }
                    }
                }
            },
        },
        "/presentations/{presentationId}:batchUpdate": {
            "post": {
                "description": "Applies one or more updates to the presentation.",
                "summary": "BatchUpdate",
                "operationId": "batchUpdate",
                "parameters": [
                    {
                        "name": "presentationId",
                        "in": "path",
                        "description": "The Presentation ID",
                        "required": true,
                        "schema": {
                            "type": "string"
                        }
                    },
                ],
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/BatchUpdateRequest"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "A presentation",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object"
                                }
                            }
                        }
                    }
                }
            }

        }
        
    },
    "components": {
        "schemas": {
            "BatchUpdateRequest": {
                "type": "object",
                "properties": {
                    "requests": {
                        "description": "A list of updates to apply to the presentation. There may be multiple requests of the same type.",
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/Request"
                        }
                    },
                    // "writeControl": {
                    //     "$ref": "#/components/schemas/WriteControl"
                    // }
                },
                "required": ["requests"]
            },
            "Request": {
                "type": "object",
                "description": "Only one of the following fields should be set. For example, if the request is to create a new slide, only the createSlide field should be set.",
                "properties": {
                    "createSlide": {
                        "$ref": "#/components/schemas/CreateSlideRequest"
                    },
                    "deleteObject": {
                        "$ref": "#/components/schemas/DeleteObjectRequest"
                    },
                    "createImage": {
                        "$ref": "#/components/schemas/CreateImageRequest"
                    },
                    "createShape": {
                        "$ref": "#/components/schemas/CreateShapeRequest"
                    },
                    "insertText": {
                        "$ref": "#/components/schemas/InsertTextRequest"
                    },
                    "deleteText": {
                        "$ref": "#/components/schemas/DeleteTextRequest"
                    },
                    // "replaceAllText": {
                    //     "$ref": "#/components/schemas/ReplaceAllTextRequest"
                    // },
                    "createParagraphBullets": {
                        "$ref": "#/components/schemas/CreateParagraphBulletsRequest"
                    },
                    "deleteParagraphBullets": {
                        "$ref": "#/components/schemas/DeleteParagraphBulletsRequest"
                    },
                    "updatePageProperties": {
                        "$ref": "#/components/schemas/UpdatePagePropertiesRequest"
                    },
                    "updateTextStyle": {
                        "$ref": "#/components/schemas/UpdateTextStyleRequest"
                    },
                    "updateShapeProperties": {
                        "$ref": "#/components/schemas/UpdateShapePropertiesRequest"
                    }
                }
            },
            "WriteControl": {
                "type": "object",
                "description": "Provides control over how write requests are executed.",
                "properties": {
                    "requiredRevisionId": {
                        "description": "The revision ID of the presentation required for the write request. If specified and the required revision ID doesn't match the presentation's current revision ID, the request will not be processed and will return a 400 bad request error.",
                        "type": "string"
                    }
                },
                "required": ["requiredRevisionId"]
            },
            "CreateSlideRequest": {
                "type": "object",
                "description": "Creates a new slide. Always create new placeholderIdMappings when adding a slide to prevent issues with overlapping ids between slides.",
                "properties": {
                    "objectId": {
                        "description": "The object ID of the slide.",
                        "type": "string"
                    },
                    "insertionIndex": {
                        "description": "The optional zero-based index at which to insert the slide. If you don't specify an index, the new slide is created at the end.",
                        "type": "integer"
                    },
                    "slideLayoutReference": {
                        "$ref": "#/components/schemas/LayoutReference"
                    },
                    "placeholderIdMappings": {
                        "description": "A mapping of layout placeholders to objectIds.",
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/PlaceholderIdMapping"
                        }
                    }
                },
                "required": ["objectId", "slideLayoutReference", "placeholderIdMappings"]
            },
            "DeleteObjectRequest": {
                "type": "object",
                "description": "Deletes an object, either pages or page elements, from the presentation.",
                "properties": {
                    "objectId": {
                        "description": "The object ID of the page or page element to delete.",
                        "type": "string"
                    }
                },
                "required": ["objectId"]
            },
            "CreateImageRequest": {
                "type": "object",
                "description": "Creates an image.",
                "properties": {
                    "objectId": {
                        "description": "The object ID of the image.",
                        "type": "string"
                    },
                    "url": {
                        "description": "The URL of the image.",
                        "type": "string"
                    },
                    "elementProperties": {
                        "description": "The element properties. If size is not specified, the default size of the image will be used.",
                        "type": "object",
                        "properties": {
                            "pageObjectId": {
                                "description": "The object ID of the page where the image will be created.",
                                "type": "string"
                            },
                            "size": {
                                "description": "The size of the image.",
                                "type": "object",
                                "properties": {
                                    "width": {
                                        "description": "The width of the image.",
                                        "type": "object",
                                        "properties": {
                                            "magnitude": {
                                                "description": "The magnitude.",
                                                "type": "number"
                                            },
                                            "unit": {
                                                "description": "The unit.",
                                                "type": "string"
                                            }
                                        },
                                        "required": ["magnitude", "unit"]
                                    },
                                    "height": {
                                        "description": "The height of the image.",
                                        "type": "object",
                                        "properties": {
                                            "magnitude": {
                                                "description": "The magnitude.",
                                                "type": "number"
                                            },
                                            "unit": {
                                                "description": "The unit.",
                                                "type": "string"
                                            }
                                        },
                                        "required": ["magnitude", "unit"]
                                    }
                                },
                                "required": ["width", "height"]
                            },
                            "transform": {
                                "description": "The transform of the image.",
                                "type": "object",
                                "properties": {
                                    "scaleX": {
                                        "description": "The X-coordinate scale.",
                                        "type": "number"
                                    },
                                    "scaleY": {
                                        "description": "The Y-coordinate scale.",
                                        "type": "number"
                                    },
                                    "shearX": {
                                        "description": "The X-coordinate shear.",
                                        "type": "number"
                                    },
                                    "shearY": {
                                        "description": "The Y-coordinate shear.",
                                        "type": "number"
                                    },
                                    "translateX": {
                                        "description": "The X-coordinate translation.",
                                        "type": "number"
                                    },
                                    "translateY": {
                                        "description": "The Y-coordinate translation.",
                                        "type": "number"
                                    },
                                    "unit": {
                                        "description": "The unit.",
                                        "type": "string"
                                    }
                                },
                                "required": ["scaleX", "scaleY", "shearX", "shearY", "translateX", "translateY", "unit"]
                            }
                        },
                        "required": ["pageObjectId"]
                    }
                },
                "required": ["objectId", "url"]
            },
            "CreateShapeRequest": {
                "type": "object",
                "description": "Creates a new shape.",
                "properties": {
                    "objectId": {
                        "description": "The object ID of the shape.",
                        "type": "string"
                    },            
                    "shapeType": {
                        "description": "The shape type.",
                        "type": "string",
                        "enum": [
                            "TEXT_BOX",
                            "RECTANGLE",
                            "ROUND_RECTANGLE",
                            "ELLIPSE",
                            "ARC",
                            "BENT_ARROW",
                            "BENT_UP_ARROW",
                            "BEVEL",
                            "BLOCK_ARC",
                            "BRACE_PAIR",
                            "BRACKET_PAIR",
                            "CAN",
                            "CHEVRON",
                            "CHORD",
                            "CLOUD",
                            "CORNER",
                            "CUBE",
                            "DONUT",
                            "DOUBLE_WAVE",
                            "DOWN_ARROW",
                            "FOLDED_CORNER",
                            "FRAME",
                            "HALF_FRAME",
                            "HEART",
                            "HEPTAGON",
                            "HEXAGON",
                            "HOME_PLATE",
                            "HORIZONTAL_SCROLL",
                            "IRREGULAR_SEAL_1",
                            "IRREGULAR_SEAL_2",
                            "LEFT_ARROW",
                            "LIGHTNING_BOLT",
                            "MATH_DIVIDE",
                            "MATH_EQUAL",
                            "MATH_MINUS",
                            "MATH_MULTIPLY",
                            "MATH_NOT_EQUAL",
                            "MATH_PLUS",
                            "MOON",
                            "NO_SMOKING",
                            "NOTCHED_RIGHT_ARROW",
                            "OCTAGON",
                            "PARALLELOGRAM",
                            "PENTAGON",
                            "PIE",
                            "PLAQUE",
                            "PLUS",
                            "QUAD_ARROW",
                            "QUAD_ARROW_CALLOUT",
                            "RECTANGULAR_CALLOUT",
                            "REGULAR_PENTAGON",
                            "RIGHT_ARROW",
                            "ROUND_1_RECTANGLE",
                            "ROUND_2_DIAGONAL_RECTANGLE",
                            "ROUND_2_SAME_RECTANGLE",
                            "RIGHT_ARROW_CALLOUT",
                            "ROUND_RECTANGLE",
                            "SMILEY_FACE",
                            "SNIP_ROUND_RECTANGLE",
                            "STAR_5",
                        ]
                    },
                    "elementProperties": {
                        "description": "The element properties.",
                        "type": "object",
                        "properties": {
                            "pageObjectId": {
                                "description": "The object ID of the page where the new shape will be created.",
                                "type": "string"
                            },
                            "size": {
                                "description": "The size of the shape.",
                                "type": "object",
                                "properties": {
                                    "height": {
                                        "description": "The height of the shape.",
                                        "type": "object",
                                        "properties": {
                                            "magnitude": {
                                                "description": "The magnitude.",
                                                "type": "number"
                                            },
                                            "unit": {
                                                "description": "The unit.",
                                                "type": "string"
                                            }
                                        },
                                        "required": ["magnitude", "unit"]
                                    },
                                    "width": {
                                        "description": "The width of the shape.",
                                        "type": "object",
                                        "properties": {
                                            "magnitude": {
                                                "description": "The magnitude.",
                                                "type": "number"
                                            },
                                            "unit": {
                                                "description": "The unit.",
                                                "type": "string"
                                            }
                                        },
                                        "required": ["magnitude", "unit"]
                                    }
                                },
                                "required": ["height", "width"]
                            },
                            "transform": {
                                "description": "The transform of the shape.",
                                "type": "object",
                                "properties": {
                                    "scaleX": {
                                        "description": "The X-coordinate scale.",
                                        "type": "number"
                                    },
                                    "scaleY": {
                                        "description": "The Y-coordinate scale.",
                                        "type": "number"
                                    },
                                    "shearX": {
                                        "description": "The X-coordinate shear.",
                                        "type": "number"
                                    },
                                    "shearY": {
                                        "description": "The Y-coordinate shear.",
                                        "type": "number"
                                    },
                                    "translateX": {
                                        "description": "The X-coordinate translation.",
                                        "type": "number"
                                    },
                                    "translateY": {
                                        "description": "The Y-coordinate translation.",
                                        "type": "number"
                                    },
                                    "unit": {
                                        "description": "The unit.",
                                        "type": "string"
                                    }
                                },
                                "required": ["scaleX", "scaleY", "shearX", "shearY", "translateX", "translateY", "unit"]
                            }
                        },
                    },
                },
            },

            "InsertTextRequest": {
                "type": "object",
                "description": "Inserts text into a shape or a table cell. This is what you generally want to use to add text to slides.",
                "properties": { 
                    "objectId": {
                        "description": "The object ID of the shape or table where the text will be inserted.",
                        "type": "string"
                    },
                    "text": {
                        "description": "The text to be inserted.",
                        "type": "string"
                    },
                    "insertionIndex": {
                        "description": "The optional index where the text will be inserted. If you don't specify an index, the text will be appended to the shape or table cell.",
                        "type": "integer"
                    }
                },
                "required": ["objectId", "text"]
            },
            "DeleteTextRequest": {
                "type": "object",
                "description": "Deletes text from a shape or a table cell. Do not delete text from a cell unless there are already TextElements in it. If there is already text in a cell and you want to replace it, delete the existing text and then insert new text",
                "properties": {
                    "objectId": {
                        "description": "The object ID of the shape or table from which the text will be deleted.",
                        "type": "string"
                    },
                    "textRange": {
                        "description": "The range of text to delete.",
                        "type": "object",
                        "properties": {
                            "type": {
                                "description": "The type of the range.",
                                "type": "string",
                                "enum": [
                                    "ALL"
                                ]
                            },
                        },
                        "required": ["type"]
                    }
                },
                "required": ["objectId", "textRange"]
            },

            "ReplaceAllTextRequest": {
                "type": "object",
                "description": "Replaces all instances of the specified text with the specified raw text with replacement text. This does not apply to placeholders. When called, the response will show the number of occurrences replaced. If there are no occurences in the output, it means the text was not found.",
                "properties": {
                    "containsText": {
                        "description": "The text that will be replaced.",
                        "type": "object",
                        "properties": {
                            "text": {
                                "description": "The text to search for.",
                                "type": "string"
                            },
                            "matchCase": {
                                "description": "If true, the search is case sensitive.",
                                "type": "boolean"
                            }
                        },
                        "required": ["text"]
                    },
                    "replaceText": {
                        "description": "The text that will replace the replaced text.",
                        "type": "string"
                    }
                },
                "required": ["containsText", "replaceText"]
            },
            "CreateParagraphBulletsRequest": {
                "type": "object",
                "description": "Creates bullets for all of the text in a shape or table cell.",
                "properties": {
                    "objectId": {
                        "description": "The object ID of the shape or table where the bullets will be created.",
                        "type": "string"
                    }
                },
                "required": ["objectId"]
            },
            "DeleteParagraphBulletsRequest": {
                "type": "object",
                "description": "Deletes bullets from all of the text in a shape or table cell.",
                "properties": {
                    "objectId": {
                        "description": "The object ID of the shape or table from which the bullets will be deleted.",
                        "type": "string"
                    }
                },
                "required": ["objectId"]
            },
            "UpdatePagePropertiesRequest": {
                "type": "object",
                "description": "Updates the properties of a Page (Slide).",
                "properties": {
                    "objectId": {
                        "description": "The object ID of the page.",
                        "type": "string"
                    },
                    "fields": {
                        "description": "The fields that should be updated. This follows FieldMask Format. At least one field must be specified. The root 'pageProperties' is implied and should not be specified. For example to update the page background solid fill color, set fields to 'pageBackgroundFill.solidFill.color'.",
                        "type": "string",
                    },
                    "pageProperties": {
                        "description": "The page properties to update.",
                        "type": "object",
                        "properties": {
                            "pageBackgroundFill": {
                                "description": "The page background fill.",
                                "type": "object",
                                "properties": {
                                    "solidFill": {
                                        "description": "The solid fill color.",
                                        "type": "object",
                                        "properties": {
                                            "color": {
                                                "description": "The color.",
                                                "type": "object",
                                                "properties": {
                                                    "rgbColor": {
                                                        "description": "The RGB color.",
                                                        "type": "object",
                                                        "properties": {
                                                            "red": {
                                                                "description": "The red component of the color, from 0.0 to 1.0.",
                                                                "type": "number"
                                                            },
                                                            "green": {
                                                                "description": "The green component of the color, from 0.0 to 1.0.",
                                                                "type": "number"
                                                            },
                                                            "blue": {
                                                                "description": "The blue component of the color, from 0.0 to 1.0.",
                                                                "type": "number"
                                                            }
                                                        },
                                                        "required": ["red", "green", "blue"]
                                                    }
                                                },
                                                "required": ["rgbColor"]
                                            },
                                            "alpha": {
                                                "description": "The alpha of the color, from 0.0 (transparent) to 1.0 (opaque). If the alpha is set to 0.0, the color is fully transparent; if the alpha is set to 1.0, the color is fully opaque.",
                                                "type": "number"
                                            }
                                        },
                                        "required": ["color", "alpha"]
                                    }
                                },
                                "required": ["solidFill"]
                            }
                        },
                        "required": ["pageBackgroundFill"]
                    }
                },
            },
            "UpdateTextStyleRequest": {
                "type": "object",
                "description": "Updates the styling of text within a Shape or Table.",
                "properties": {
                    "objectId": {
                        "description": "The object ID of the shape or table containing the text to update.",
                        "type": "string"
                    },
                    "fields": {
                        "description": "The fields that should be updated in FieldMask format. At least one field must be specified. The root 'style' is implied and should not be specified. For example, to update the text style to bold, set fields to 'bold'.",
                        "type": "string"
                    },
                    "textRange": {
                        "description": "The range of text to style.",
                        "type": "object",
                        "properties": {
                            "startIndex": {
                                "description": "The inclusive start index of the range.",
                                "type": "integer"
                            },
                            "endIndex": {
                                "description": "The exclusive end index of the range.",
                                "type": "integer"
                            },
                            "type": {
                                "description": "The type of the range. If 'ALL' is used, startIndex and endIndex must not be set.",
                                "type": "string",
                                "enum": [
                                    "FIXED_RANGE",
                                    "ALL"
                                ]
                            },
                        },
                        "required": ["type"]
                    },
                    "style": {
                        "description": "The text style to set.",
                        "type": "object",
                        "properties": {
                            "bold": {
                                "description": "Whether or not the text is bold.",
                                "type": "boolean"
                            },
                            "italic": {
                                "description": "Whether or not the text is italic.",
                                "type": "boolean"
                            },
                            "fontFamily": {
                                "description": "The font family.",
                                "type": "string"
                            },
                            "fontSize": {
                                "description": "The font size.",
                                "type": "object",
                                "properties": {
                                    "magnitude": {
                                        "description": "The magnitude.",
                                        "type": "number"
                                    },
                                    "unit": {
                                        "description": "The unit.",
                                        "type": "string"
                                    }
                                },
                                "required": []
                            },
                            "foregroundColor": {
                                "description": "The foreground color.",
                                "type": "object",
                                "properties": {
                                    "opaqueColor": {
                                        "description": "The opaque color.",
                                        "type": "object",
                                        "properties": {
                                            "rgbColor": {
                                                "description": "The RGB color.",
                                                "type": "object",
                                                "properties": {
                                                    "red": {
                                                        "description": "The red component of the color, from 0.0 to 1.0.",
                                                        "type": "number"
                                                    },
                                                    "green": {
                                                        "description": "The green component of the color, from 0.0 to 1.0.",
                                                        "type": "number"
                                                    },
                                                    "blue": {
                                                        "description": "The blue component of the color, from 0.0 to 1.0.",
                                                        "type": "number"
                                                    }
                                                },
                                                "required": ["red", "green", "blue"]
                                            }
                                        },
                                        "required": ["rgbColor"]
                                    }
                                },
                                "required": ["opaqueColor"]
                            },
                        },
                        "required": [],
                    },
                },
                "required": ["objectId", "fields", "textRange", "style"]
            },
            "UpdateShapePropertiesRequest": {
                "type": "object",
                "description": "Updates the properties of a Shape.",
                "properties": {
                    "objectId": {
                        "description": "The object ID of the shape.",
                        "type": "string"
                    },
                    "fields": {
                        "description": "The fields that should be updated. This is FieldMask format. At least one field must be specified. The root 'shapeProperties' is implied and should not be specified. For example, to update the shape background fill color, set fields to 'shapeBackgroundFill.solidFill.color'.",
                        "type": "string"
                    },
                    "shapeProperties": {
                        "description": "The shape properties to update.",
                        "type": "object",
                        "properties": {
                            "shapeBackgroundFill": {
                                "description": "The shape background fill.",
                                "type": "object",
                                "properties": {
                                    "solidFill": {
                                        "description": "The solid fill color.",
                                        "type": "object",
                                        "properties": {
                                            "color": {
                                                "description": "The color.",
                                                "type": "object",
                                                "properties": {
                                                    "rgbColor": {
                                                        "description": "The RGB color.",
                                                        "type": "object",
                                                        "properties": {
                                                            "red": {
                                                                "description": "The red component of the color, from 0.0 to 1.0.",
                                                                "type": "number"
                                                            },
                                                            "green": {
                                                                "description": "The green component of the color, from 0.0 to 1.0.",
                                                                "type": "number"
                                                            },
                                                            "blue": {
                                                                "description": "The blue component of the color, from 0.0 to 1.0.",
                                                                "type": "number"
                                                            }
                                                        },
                                                        "required": ["red", "green", "blue"]
                                                    }
                                                },
                                                "required": ["rgbColor"]
                                            },
                                            "alpha": {
                                                "description": "The alpha of the color, from 0.0 (transparent) to 1.0 (opaque). If the alpha is set to 0.0, the color is fully transparent; if the alpha is set to 1.0, the color is fully opaque.",
                                                "type": "number"
                                            }
                                        },
                                        "required": ["color", "alpha"]
                                    }
                                },
                                "required": ["solidFill"]
                            },
                            "outline": {
                                "description": "The outline of the shape.",
                                "type": "object",
                                "properties": {
                                    "outlineFill": {
                                        "description": "The outline fill.",
                                        "type": "object",
                                        "properties": {
                                            "solidFill": {
                                                "description": "The solid fill color.",
                                                "type": "object",
                                                "properties": {
                                                    "color": {
                                                        "description": "The color.",
                                                        "type": "object",
                                                        "properties": {
                                                            "rgbColor": {
                                                                "description": "The RGB color.",
                                                                "type": "object",
                                                                "properties": {
                                                                    "red": {
                                                                        "description": "The red component of the color, from 0.0 to 1.0.",
                                                                        "type": "number"
                                                                    },
                                                                    "green": {
                                                                        "description": "The green component of the color, from 0.0 to 1.0.",
                                                                        "type": "number"
                                                                    },
                                                                    "blue": {
                                                                        "description": "The blue component of the color, from 0.0 to 1.0.",
                                                                        "type": "number"
                                                                    }
                                                                },
                                                                "required": ["red", "green", "blue"]
                                                            }
                                                        },
                                                        "required": ["rgbColor"]
                                                    }
                                                },
                                                "required": ["color"]
                                            }
                                        },
                                        "required": ["solidFill"]
                                    },
                                    "weight": {
                                        "description": "The thickness of the outline.",
                                        "type": "object",
                                        "properties": {
                                            "magnitude": {
                                                "description": "The magnitude.",
                                                "type": "number"
                                            },
                                            "unit": {
                                                "description": "The unit.",
                                                "type": "string"
                                            }
                                        },
                                        "required": ["magnitude", "unit"]
                                    },
                                    "dashStyle": {
                                        "description": "The dash style of the outline.",
                                        "type": "string",
                                        "enum": [
                                            "SOLID",
                                            "DOT",
                                            "DASH",
                                            "DASH_DOT",
                                            "LONG_DASH",
                                            "LONG_DASH_DOT",
                                        ]
                                    }
                                },
                                "required": ["outlineFill", "weight"]
                            },
                            "contentAlignment": {
                                "description": "The content alignment of the shape.",
                                "type": "string",
                                "enum": [
                                    "TOP",
                                    "MIDDLE",
                                    "BOTTOM",
                                ]
                            }                            
                        },
                        "required": []
                    }
                },
                "required": ["objectId", "fields", "shapeProperties"]
            },
            "LayoutReference": {
                "type": "object",
                "description": "A reference to a layout in the presentation.",
                "properties": {
                    "predefinedLayout": {
                        "description": "The predefined layout.",
                        "type": "string",
                        "enum": [
                            "BLANK",
                            "TITLE",
                            "TITLE_AND_BODY",
                            "TITLE_AND_TWO_COLUMNS",
                            "TITLE_ONLY",
                            "SECTION_HEADER",
                            "SECTION_TITLE_AND_DESCRIPTION",
                            "ONE_COLUMN_TEXT",
                            "MAIN_POINT",
                            "BIG_NUMBER",
                        ]
                    }
                },
                "required": ["predefinedLayout"]
            },
            "PlaceholderIdMapping": {
                "type": "object",
                "description": "A mapping from a placeholder to new objectIds in the slide.",
                "properties": {
                   "layoutPlaceholder": {
                      "$ref": "#/components/schemas/Placeholder"
                     },
                    "objectId": {
                        "description": "A new unique identifier for the the placeholder on the new slide.",
                        "type": "string"
                    }
                },
                "required": ["layoutPlaceholder", "objectId"]
            },
            "Placeholder": {
                "type": "object",
                "description": "A placeholder.",
                "properties": {
                    "index": {
                        "description": "The placeholder index. Starts at 0, only increment if there is more than one placeholder with the same type.",
                        "type": "integer"
                    },
                    "type": {
                        "description": "The type of the placeholder. This is matches the predefined layout. For example, 'TITLE_AND_BODY' layout will have a 'TITLE' placeholder and a 'BODY' placeholder.",
                        "type": "string",
                        "enum": [
                            "NONE",
                            "BODY",
                            "CHART",
                            "CENTERED_TITLE",
                            "FOOTER",
                            "HEADER",
                            "SLIDE_NUMBER",
                            "SUBTITLE",
                            "TITLE"                            
                        ]
                    }
                },
                "required": ["index", "type"]
            },


        },
        "securitySchemes": {
            "oauth2": {
                "type": "oauth2",
                "flows": {
                    "authorizationCode": {
                        "authorizationUrl": "https://accounts.google.com/o/oauth2/auth",
                        "tokenUrl": "https://accounts.google.com/o/oauth2/token",
                        "scopes": {
                            "https://www.googleapis.com/auth/drive.file": "View and manage the files in your Google Drive"
                        }
                    }
                }
            }
        }
    }
};

export default schema;