const schema = {
    "openapi": "3.0.0",
    "info": {
        "title": "Excalidraw",
        "description": "Excalidraw API",
        "version": "1.0.0"
    },
    "security": [
        {
            "oauth2": [
                "coding-tools"
            ]
        }
    ],
    "servers": [
        {
            "url": "https://localhost:3000/excalidraw"
        }
    ],
    "paths": {
        "/excalidraw/elements": {
            "description": "List elements. Use the 'id' property to identify the element.",
            "get": {
                "summary": "List elements",
                "operationId": "listElements",
                "responses": {
                    "200": {
                        "description": "A list of elements",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/components/schemas/ExcalidrawElement"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "post": {
                "summary": "Create an element",
                "operationId": "createElement",
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ExcalidrawElement"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "The created element",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ExcalidrawElement"
                                }
                            }
                        }
                    }
                }
            },
            "put": {
                "summary": "Create or update elements",
                "operationId": "createOrUpdateElements",
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "elements": {
                                        "type": "array",
                                        "items": {
                                            "$ref": "#/components/schemas/ExcalidrawElement"
                                        }
                                    }
                                },
                                "required": [
                                    "elements"
                                ]
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "The elements",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/components/schemas/ExcalidrawElement"
                                    }
                                }
                            }
                        }
                    }
                }
            },
        },
        "/excalidraw/elements/{elementId}": {
            "put": {
                "summary": "Update an element",
                "operationId": "updateElement",
                "parameters": [
                    {
                        "name": "elementId",
                        "in": "path",
                        "description": "The ID of the element to update.",
                        "required": true,
                        "schema": {
                            "type": "string"
                        }
                    }
                ],
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ExcalidrawElement"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "The updated element",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ExcalidrawElement"
                                }
                            }
                        }
                    }
                }
            },
            "delete": {
                "summary": "Delete an element",
                "operationId": "deleteElement",
                "parameters": [
                    {
                        "name": "elementId",
                        "in": "path",
                        "description": "The ID of the element to delete.",
                        "required": true,
                        "schema": {
                            "type": "string"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "The deleted element",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ExcalidrawElement"
                                }
                            }
                        }
                    }
                }
            }
        },
    },
    "components": {
        "schemas": {
            "ExcalidrawElement": {
                "type": "object",
                "description": "An Excalidraw element",
                "properties": {
                    "type": {
                        "type": "string",
                        "description": "The type of the element",
                        "enum": [
                            "rectangle",
                            "ellipse",
                            "diamond",
                            "arrow",
                            "line",
                            "frame",
                            "text",
                        ]
                    },
                    "id": {
                        "type": "string",
                        "description": "A unique identifier for the element. Use short strings like rectangle-0, ellipse-1, etc."
                    },
                    "x": {
                        "type": "number",
                        "description": "The x-coordinate of the element. This is the left edge of the element, or the starting point of the line or arrow."
                    },
                    "y": {
                        "type": "number",
                        "description": "The y-coordinate of the element. This is the top edge of the element, or the starting point of the line or arrow."
                    },
                    "strokeColor": {
                        "type": "string",
                        "description": "The color of the element's border. Use hex color codes like #000000."
                    },
                    "strokeWidth": {
                        "type": "number",
                        "description": "The width of the element's border"
                    },
                    "backgroundColor": {
                        "type": "string",
                        "description": "The color of the element's background. Use hex color codes like #000000."
                    },
                    "width": {
                        "type": "number",
                        "description": "The width of the element. Optional, can be auto-calculated based on the element's content. Can be used for lines and arrows to set the length.",
                    },
                    "height": {
                        "type": "number",
                        "description": "The height of the element. Optional, can be auto-calculated based on the element's content. Can be used for lines and arrows to set the length.",
                    },
                    "label": {
                        "type": "object",
                        "description": "Text inside the element",
                        "properties": {
                            "text": {
                                "type": "string",
                                "description": "The text content"
                            },
                            "fontSize": {
                                "type": "number",
                                "description": "The font size of the text"
                            },
                            "strokeColor": {
                                "type": "string",
                                "description": "The color of the text"
                            },
                            "textAlign": {
                                "type": "string",
                                "description": "The alignment of the text",
                                "enum": [
                                    "left",
                                    "center",
                                    "right"
                                ]
                            },
                            "verticalAlign": {
                                "type": "string",
                                "description": "The vertical alignment of the text",
                                "enum": [
                                    "top",
                                    "middle",
                                    "bottom"
                                ]
                            },
                        },
                        "required": [
                            "text"
                        ]
                        
                    },
                    "text": {
                        "type": "string",
                        "description": "Text inside the element, applicable only for text elements"
                    },
                    "fontSize": {
                        "type": "number",
                        "description": "The font size of the text, applicable only for text elements"
                    },
                    "start": {
                        "type": "object",
                        "description": "The starting point of the line or arrow",
                        "properties": {
                            "id": {
                                "type": "string",
                                "description": "The ID of the starting point, example, rectangle-0"
                            },
                        },
                        "required": [
                            "id"
                        ]
                    },
                    "end": {
                        "type": "object",
                        "description": "The ending point of the line or arrow",
                        "properties": {
                            "id": {
                                "type": "string",
                                "description": "The ID of the ending point, example, rectangle-1"
                            },
                        },
                        "required": [
                            "id"
                        ]
                    },
                },
                "required": [
                    "type",
                    "id",
                    "x",
                    "y",
                ]
            },
        }
    }
}

export default schema;