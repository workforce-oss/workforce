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
                "https://www.googleapis.com/auth/drive.readonly"
            ]
        }
    ],
    "servers": [
        {
            "url": "https://sheets.googleapis.com/v4"
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
        "securitySchemes": {
            "oauth2": {
                "type": "oauth2",
                "flows": {
                    "authorizationCode": {
                        "authorizationUrl": "https://accounts.google.com/o/oauth2/auth",
                        "tokenUrl": "https://accounts.google.com/o/oauth2/token",
                        "scopes": {
                            "https://www.googleapis.com/auth/drive.readonly": "View and manage the files in your Google Drive"
                        }
                    }
                }
            }
        }
    }
};

export default schema;