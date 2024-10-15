const schema = {
    "openapi": "3.0.0",
    "info": {
        "title": "Google Drive",
        "description": "Google Drive API",
        "version": "1.0.0"
    },
    "security": [
        {
            "oauth2": [
                "https://www.googleapis.com/auth/drive.file"
            ]
        }
    ],
    "servers": [
        {
            "url": "https://www.googleapis.com/drive/v3"
        }
    ],
    "paths": {
        "/drives": {
            "description": "List drives. Use the 'id' property to identify the drive.",
            "get": {
                "summary": "List drives",
                "operationId": "listDrives",
                "parameters": [
                    {
                        "name": "pageSize",
                        "in": "query",
                        "description": "The maximum number of drives to return. Acceptable values are 1 to 100, inclusive.",
                        "required": false,
                        "schema": {
                            "type": "integer",
                            "format": "int32",
                            "minimum": 1,
                            "maximum": 100
                        }
                    },
                    {
                        "name": "pageToken",
                        "in": "query",
                        "description": "The token for continuing a previous list request on the next page. This should be set to the value of 'nextPageToken' from the previous response.",
                        "required": false,
                        "schema": {
                            "type": "string"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "A list of drives",
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
        },
        "/files": {
            "get": {
                "summary": "List files",
                "operationId": "listFiles",
                "parameters": [
                    {
                        "name": "pageSize",
                        "in": "query",
                        "description": "The maximum number of files to return. Acceptable values are 1 to 100, inclusive.",
                        "required": false,
                        "schema": {
                            "type": "integer",
                            "format": "int32",
                            "minimum": 1,
                            "maximum": 100
                        }
                    },
                    {
                        "name": "pageToken",
                        "in": "query",
                        "description": "The token for continuing a previous list request on the next page. This should be set to the value of 'nextPageToken' from the previous response.",
                        "required": false,
                        "schema": {
                            "type": "string"
                        }
                    },
                    {
                        "name": "driveId",
                        "in": "query",
                        "description": "The ID of the drive to list files from.",
                        "required": false,
                        "schema": {
                            "type": "string"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "A list of files",
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
            "post": {
                "summary": "Create file",
                "operationId": "createFile",
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/File"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "The created file",
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
        },
        "/files/{fileId}": {
            "get": {
                "summary": "Get file",
                "operationId": "getFile",
                "parameters": [
                    {
                        "name": "fileId",
                        "in": "path",
                        "description": "The ID of the file to get.",
                        "required": true,
                        "schema": {
                            "type": "string"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "The file",
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
            "File": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string"
                    },
                    "mimeType": {
                        "type": "string",
                        "description": "The MIME type of the file.",
                        "enum": [
                            "application/vnd.google-apps.document",
                            "application/vnd.google-apps.spreadsheet",
                            "application/vnd.google-apps.presentation",
                            "application/vnd.google-apps.form",
                            "application/vnd.google-apps.site",
                            "application/vnd.google-apps.folder",
                            "application/vnd.google-apps.map",
                            "application/vnd.google-apps.photo",
                            "application/vnd.google-apps.file"
                        ]
                    },
                    "parents": {
                        "description": "The IDs of the parent folders the file is in.",
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    }
                },
                "required": [
                    "name",
                    "mimeType"
                ]
            }
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