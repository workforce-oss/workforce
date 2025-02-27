
const schema = {
  "openapi": "3.0.0",
  "info": {
    "title": "AIDE",
    "description": "Artificial Intelligence Development Environment. A project is the codebase for an individual application. A reference project is a codebase that is used as a reference for a project. An execution plan is a list of steps to execute on a project. A step is an action to execute on a project file. A project file is a file in a project or reference project. A project file type is a type of file in a project or reference project.",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:3000"
    }
  ],
  "paths": {
    "/projects": {
      "get": {
        "summary": "List Projects",
        "description": "Get a list of all existing projects",
        "responses": {
          "200": {
            "description": "Projects Found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ListProjectsResponse"
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create Project",
        "description": "Create a new project",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Project"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Project Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateProjectResponse"
                }
              }
            }
          }
        }
      }
    },
    "/projects/{slug}": {
      "get": {
        "summary": "Get Project",
        "description": "Retrieves a project including details",
        "parameters": [
          {
            "name": "slug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Project Found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GetProjectResponse"
                }
              }
            }
          }
        }
      }
    },
    "/projects/{slug}/projectFile": {
      "get": {
        "summary": "Get Project File with Content",
        "description": "Retrieves a project file by location with content",
        "parameters": [
          {
            "name": "slug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "location",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
        ],
        "responses": {
          "200": {
            "description": "Project File Found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ProjectFile"
                }
              }
            }
          }
        }
      }
    },
    "/referenceProjects": {
      "get": {
        "summary": "List Reference Projects",
        "description": "Retrieves a list of all existing Reference Projects",
        "responses": {
          "200": {
            "description": "Reference Projects Found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ListReferenceProjectsResponse"
                }
              }
            }
          }
        }
      }
    },
    "/referenceProjects/{slug}": {
      "get": {
        "summary": "Get Reference Project",
        "description": "Retrieves a Reference Project including details",
        "parameters": [
          {
            "name": "slug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Reference Project Found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GetReferenceProjectResponse"
                }
              }
            }
          }
        }
      }
    },
    // "/executionPlans": {
    //   "post": {
    //     "summary": "Prepare an Execution Plan",
    //     "description": "Prepare an Execution Plan. An execution plan does not perform any actions on the project. It only prepares the plan. Do not include the details field in the steps.",
    //     "requestBody": {
    //       "required": true,
    //       "content": {
    //         "application/json": {
    //           "schema": {
    //             "$ref": "#/components/schemas/ExecutionPlan"
    //           }
    //         }
    //       }
    //     },
    //     "responses": {
    //       "200": {
    //         "description": "Execution Plan Prepared",
    //         "content": {
    //           "application/json": {
    //             "schema": {
    //               "$ref": "#/components/schemas/ExecutionPlanResponse"
    //             }
    //           }
    //         }
    //       }
    //     }
    //   }
    // },
    "/executeStep": {
      "post": {
        "summary": "Execute Step",
        "description": "Execute a specific step on the project.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ExecutionStepRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Step Executed",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ExecutionStepResponse"
                }
              }
            }
          }
        }
      }
    },
    "/commitAndPush": {
      "post": {
        "summary": "Commit and Push",
        "description": "Commit and Push changes to the project. Only use this endpoint when you are ready to commit and push changes, after all steps have been executed, and you are satisfied with the changes.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CommitAndPushRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Changes Committed and Pushed",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CommitAndPushResponse"
                }
              }
            }
          }
        }
      }
    },
    "/checkOutBranch": {
      "post": {
        "summary": "Check Out Branch",
        "description": "Check out a branch in the project.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "branch": {
                    "type": "string",
                    "description": "The name of the branch to check out"
                  }
                },
                "required": [
                  "branchName"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Branch Checked Out",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "description": "A message indicating the branch was checked out"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/collabUrl": {
      "get": {
        "summary": "Get Collaboration URL",
        "description": "Get the URL needed to collaborate on a project",
        "responses": {
          "200": {
            "description": "Collaboration URL Found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "collabUrl": {
                      "type": "string",
                      "description": "The URL needed to collaborate on a project"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/convertToReferenceProject": {
      "post": {
        "summary": "Convert to Reference Project",
        "description": "Convert an existing project to a reference project",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ConvertToReferenceProjectRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Project Converted to Reference Project",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ConvertToReferenceProjectResponse"
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
      "Project": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "The name of the project"
          },
          "slug": {
            "type": "string",
            "description": "The unique identifier for the project"
          },
          "description": {
            "type": "string",
            "description": "The description of the project"
          },
          "location": {
            "type": "string",
            "description": "The location of the project in the file system"
          },
          "projectType": {
            "type": "string",
            "description": "The type of project"
          },
          "language": {
            "type": "string",
            "description": "The language of the project"
          },
          "referenceProjectLocation": {
            "type": "string",
            "description": "The location of the reference project in the file system"
          },
          "projectFiles": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ProjectFile"
            }
          }
        },
        "required": [
          "name",
          "location",
          "projectType",
          "language",
          "referenceProjectLocation"
        ]
      },
      "ProjectFile": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "The location of the file in the Project"
          },
          "projectFileType": {
            "type": "string",
            "description": "The type of project file"
          },
          "description": {
            "type": "string",
            "description": "A description of the file"
          },
          "content": {
            "type": "string",
            "description": "The raw content of the file"
          }
        },
        "required": [
          "location",
          "projectFileType"
        ]
      },
      "ReferenceProject": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "The name of the project"
          },
          "slug": {
            "type": "string",
            "description": "The unique identifier for the project"
          },
          "location": {
            "type": "string",
            "description": "The location of the project in the file system"
          },
          "projectType": {
            "type": "string",
            "description": "The type of project"
          },
          "language": {
            "type": "string",
            "description": "The language of the project"
          },
          "description": {
            "type": "string",
            "description": "The description of the project"
          },
          "projectFileTypes": {
            "type": "array",
            "description": "A list of file types in the reference project",
            "items": {
              "$ref": "#/components/schemas/ProjectFileType"
            }
          },
          "projectFiles": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ProjectFile"
            }
          }
        }
      },
      "ProjectFileType": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "The name of the project file type"
          },
          "description": {
            "type": "string",
            "description": "A discription of the project file type"
          },
          "priority": {
            "type": "string",
            "description": "The priority of this file type when executing a coding plan"
          }
        }
      },
      "MachineState": {
        "type": "object",
        "properties": {
          "summary": {
            "type": "string",
            "description": "A summary of the project state"
          },
          "currentFile": {
            "$ref": "#/components/schemas/ProjectFile"
          },
          "referenceFile": {
            "$ref": "#/components/schemas/ProjectFile"
          }
        }
      },
      "ListProjectsResponse": {
        "type": "object",
        "properties": {
          "projects": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Project"
            }
          }
        }
      },
      "GetProjectResponse": {
        "type": "object",
        "properties": {
          "project": {
            "$ref": "#/components/schemas/Project"
          },
          "machineState": {
            "$ref": "#/components/schemas/MachineState"
          }
        }
      },
      "CreateProjectResponse": {
        "type": "object",
        "properties": {
          "project": {
            "$ref": "#/components/schemas/Project"
          }
        }
      },
      "ListReferenceProjectsResponse": {
        "type": "object",
        "properties": {
          "referenceProjects": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ReferenceProject"
            }
          }
        }
      },
      "GetReferenceProjectResponse": {
        "type": "object",
        "properties": {
          "referenceProject": {
            "$ref": "#/components/schemas/ReferenceProject"
          },
          "machineState": {
            "$ref": "#/components/schemas/MachineState"
          }
        }
      },
      "ExecutionPlan": {
        "type": "object",
        "properties": {
          "projectLocation": {
            "type": "string",
            "description": "The location of the project to execute the plan on"
          },
          "description": {
            "type": "string",
            "description": "A description of the plan"
          },
          "branch": {
            "type": "string",
            "description": "The branch to execute the plan on"
          },
          "steps": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ExecutionPlanExecutionStep"
            }
          }
        },
        "required": [
          "projectLocation",
          "branch",
          "steps"
        ]
      },
      "ExecutionPlanResponse": {
        "type": "object",
        "properties": {
          "files": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ProjectFile"
            }
          },
          "referenceFiles": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ProjectFile"
            }
          },
          "machineState": {
            "$ref": "#/components/schemas/MachineState"
          }
        }
      },
      "ExecutionStep": {
        "type": "object",
        "description": "An action to execute on a project file. Prefer a larger number of smaller steps over a smaller number of larger steps. This is to reduce the number of tokens our LLM has to generate. Use create_function, update_function, delete_function, create_property, update_property and delete_property for any files with more than 300 lines. Only use create_file and update_file when absolutely necessary.",
        "properties": {
          "order": {
            "type": "integer",
            "description": "The order of the step in the execution plan"
          },
          "actionDescription": {
            "type": "string",
            "description": "A description of the action being executed"
          },
          "fileDescription": {
            "type": "string",
            "description": "A description of the file being executed on"
          },
          "projectFileLocation": {
            "type": "string",
            "description": "The file to execute the action on. This is a relative path to the file in the project. For example if the project is at /home/user/project and the file is at /home/user/project/src/main/java/com/example/MyClass.java, then the project file location is src/main/java/com/example/MyClass.java"
          },
          "projectFileType": {
            "type": "string",
            "description": "The type of project file to execute the step on"
          },
          "action": {
            "type": "string",
            "description": "The action to execute on the file. Prefer create_function, create_property, update_function, update_property, delete_function, delete_property. This is to reduce the number of tokens our LLM has to generate. Only use create and update file when absolutely necessary.",
            "enum": [
              "create_file",
              "create_function",
              "create_property",
              "update_file",
              "update_function",
              "update_property",
              "delete_file",
              "delete_function",
              "delete_property"
            ]
          },
          "details": {
            "type": "object",
            "description": "The details for the action",
            "properties": {
              "name": {
                "type": "string",
                "description": "The name of the function or property (if applicable)"
              },
              "className": {
                "type": "string",
                "description": "The class in which the function or property is located (if applicable). Be sure to include the class name when when the file contains a class."
              },
              "text": {
                "type": "string",
                "description": "The content of the file or function or property"
              },
            },
            "required": [
              // "text"
            ]
          }
        },
        "required": [
          "order",
          "projectFileLocation",
          "projectFileType",
          "action",
          "actionDescription",
          "details"
        ]
      },
      "ExecutionPlanExecutionStep": {
        "type": "object",
        "properties": {
          "order": {
            "type": "integer",
            "description": "The order of the step in the execution plan"
          },
          "actionDescription": {
            "type": "string",
            "description": "A description of the action being executed"
          },
          "fileDescription": {
            "type": "string",
            "description": "A description of the file being executed on"
          },
          "projectFileLocation": {
            "type": "string",
            "description": "This is a relative path to the file in the project. For example if the project is at /home/user/project and the file is at /home/user/project/src/main/java/com/example/MyClass.java, then the project file location is src/main/java/com/example/MyClass.java"
          },
          "projectFileType": {
            "type": "string",
            "description": "The type of project file to execute the step on"
          },
          "action": {
            "type": "string",
            "description": "The action to execute on the project file. Prefer create_function, create_property, update_function, update_property, delete_function, delete_property. Only use create and update file when absolutely necessary.",
            "enum": [
              "create_file",
              "create_function",
              "create_property",
              "update_file",
              "update_function",
              "update_property",
              "delete_file",
              "delete_function",
              "delete_property"
            ]
          },
        },
        "required": [
          "order",
          "projectFileLocation",
          "projectFileType",
          "action",
          "actionDescription",
        ]
      },
      "ExecutionStepRequest": {
        "type": "object",
        "properties": {
          "step": {
            "$ref": "#/components/schemas/ExecutionStep"
          },
          "projectLocation": {
            "type": "string",
            "description": "The location of the project to execute the step on"
          },
          "nextFileLocation": {
            "type": "string",
            "description": "The location of the file used in the next step. Include this when executing the step."
          },
          "nextFileType": {
            "type": "string",
            "description": "The type of file used in the next step. Include this when executing the step."
          }
        },
        "required": [
          "step",
          "projectLocation",
          "nextFileLocation",
          "nextFileType"
        ]
      },
      "ExecutionStepResponse": {
        "type": "object",
        "properties": {
          "machineState": {
            "$ref": "#/components/schemas/MachineState"
          },
          "result": {
            "type": "string",
            "description": "The result of the execution step"
          }
        }
      },
      "ConvertToReferenceProjectRequest": {
        "type": "object",
        "properties": {
          "existingProjectSlug": {
            "type": "string",
            "description": "The slug of the existing project to convert to a reference project"
          },
          "newName": {
            "type": "string",
            "description": "The new name for the reference project"
          },
          "newDescription": {
            "type": "string",
            "description": "The new description for the reference project"
          },
          "newLocation": {
            "type": "string",
            "description": "The new location for the reference project"
          },
          "projectFileTypes": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ProjectFileType"
            }
          }
        },
        "required": [
          "existingProjectSlug",
          "newName",
          "newDescription",
          "newLocation",
          "projectFileTypes"
        ]
      },
      "ConvertToReferenceProjectResponse": {
        "type": "object",
        "properties": {
          "referenceProject": {
            "$ref": "#/components/schemas/ReferenceProject"
          }
        }
      },
      "CommitAndPushRequest": {
        "type": "object",
        "properties": {
          "projectLocation": {
            "type": "string",
            "description": "The location of the project to commit and push"
          },
          "branch": {
            "type": "string",
            "description": "Create a new branch with a user-friendly name. Do not include the ticket id. Do not use an existing branch."
          },
          "message": {
            "type": "string",
            "description": "A message to include with the commit"
          }
        },
        "required": [
          "projectLocation",
          "branch",
          "description"
        ]
      },
      "CommitAndPushResponse": {
        "type": "object",
        "properties": {
          "result": {
            "type": "string",
            "description": "The result of the commit and push"
          }
        }
      }
    }
  }
}

export default schema;