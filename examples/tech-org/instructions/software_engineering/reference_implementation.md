## Reference Implementation
Your goal is to take a software architecure document and create one or more reference projects to be used as a starting point for new projects. A reference implementation is a working example of a software system that demonstrates the key concepts and patterns outlined in the software architecture document. The intent of a reference implementation is to provide developers with a starting point for new projects and to ensure that they follow the architectural guidelines.

These may be microservices, libraries, or user interfaces that provide simple baseline implementations with example data and functionality. The reference implementation should be well-documented and include instructions for developers on how to use it.

Ensure the reference implementation has examples of data access, business logic, and presentation layers. Include example tests and validation, and examples of integration with other systems or services.

When a developer has access to your reference implementation, they should have everything they need to know how to build a new project and the steps to follow to implement the software system.

You will be given access to code repositories, design documents, and other resources to help you create the reference implementation. Your implementation should follow the guidelines outlined in the software architecture document and demonstrate best practices for software development.

Always create a new project first and write all of the code. When you are done, convert it to a reference project. This will ensure that you have a clean, working project to use as a reference.

A Reference Project may have a structure that looks something like this:

```json
{
    "name": "Spring Boot Maven Reference",
    "slug": "spring-boot-maven-reference",
    "description": "Spring Boot Maven Reference\n\"Each Model/Entity pair needs its own mapper. Ensure there are tests for all Service and Controller classes.",
    "location": "spring-boot-maven-reference",
    "projectType": "spring-boot-maven",
    "language": "java",
    "dependencyScript": "mvn clean install",
    "dependecyFile": "pom.xml",
    "projectFileTypes": [
    {
        "name": "pom",
        "description": "A maven pom file for the project. Make sure to change the groupId and artifactId to match your project. Use real values, not placeholders.  Make use the information you have to fill everything in.",
        "priority": 0
    },
    {
        "name": "root-application-class",
        "description": "The root application class for a Spring Boot project",
        "priority": 1
    },
    {
        "name": "model",
        "description": "Model class for a Spring Boot project. Uses Validation Annotations",
        "priority": 2
    },
    {
        "name": "jpa-entity",
        "description": "JPA Entity to use to manage the table schema.  It should use the same name as the model with the suffix Entity.  Example: Model: Account, Entity: AccountEntity.",
        "priority": 3
    },
    {
        "name": "jpa-repository",
        "description": "Spring Boot Repository class.  It should use the same name as the model with the suffix Repository.  Example: Model: Account, Repository: AccountRepository.",
        "priority": 4
    },
    {
        "name": "integration-model",
        "description": "Spring Boot Java Model class. This model is for integration and does not need explicit validation rules.  You may need to create more than one of these.  There should be one for each component we need from the integration schema.",
        "priority": 5
    },
    {
        "name": "feign-client",
        "description": "Feign Client to call an external api.  Use the same name as the model with the suffix ApiClient.  Example: Model: Customer, ApiClient: CustomerApiClient.  Be sure to use the models built for this integration.  They should already exist in the project.",
        "priority": 6
    },
    {
        "name": "feign-client-test",
        "description": "JUnit test for the feign client.  Load a full Spring Boot context so that we get the necessary beans. Use Junit 5 with jupiter apis.  When creating model objects, use the zero args constructor.",
        "priority": 7
    },
    {
        "name": "mapper",
        "description": "Mapstruct Mapper to map between the model and jpa entity.  It should use the same name as the model with the suffix Mapper.  Example: Model: Account, Mapper: AccountMapper.",
        "priority": 8
    },
    {
        "name": "service",
        "description": "Spring Boot Service to manage the business logic.  It should use the same name as the model with the suffix Service.  Example: Model: Account, Service: AccountService.  Autowire the repository, mapstruct mapper, and feign clients if applicable.  Do not use the interface/impl pattern.  Include any business logic present in sequence diagrams, including integrations with other apis.",
        "priority": 9
    },
    {
        "name": "controller",
        "description": "Controller class for a REST API.  Use the service and model classes to implement the controller.",
        "priority": 10
    },
    {
        "name": "exception",
        "description": "Custom exception class.  It should use the same name as the model with the suffix Exception.  Example: Model: Account, Exception: AccountException.",
        "priority": 11
    },
    {
        "name": "application-properties",
        "description": "Spring Boot application configuration file.  Configure the application to use an in-memory H2 database.",
        "priority": 12
    },
    {
        "name": "controller-test",
        "description": "Test class for a Spring Boot project.  Tests the REST endpoints.",
        "priority": 13
    },
    {
        "name": "service-test",
        "description": "Test class for a Spring Boot project.  Tests the service class.",
        "priority": 14
    },
    {
        "name": "test-properties",
        "description": "Application properties file for testing.",
        "priority": 15
    }
    ],
    "projectFiles": [
    {
        "location": "pom.xml",
        "projectFileType": "pom",
        "description": "Maven POM file"
    },
    {
        "location": "src/main/java/com/testbed/accountapi/Application.java",
        "projectFileType": "root-application-class",
        "description": "Spring Boot Application Root Class"
    },
    {
        "location": "src/main/java/com/testbed/accountapi/model/Account.java",
        "projectFileType": "model",
        "description": "Spring Boot Model Class"
    },
    {
        "location": "src/main/java/com/testbed/accountapi/persistence/AccountEntity.java",
        "projectFileType": "jpa-entity",
        "description": "JPA Persistence Class"
    },
    {
        "location": "src/main/java/com/testbed/accountapi/repository/AccountRepository.java",
        "projectFileType": "jpa-repository",
        "description": "Spring Boot Repository Class"
    },
    {
        "location": "src/main/java/com/testbed/accountapi/service/AccountMapper.java",
        "projectFileType": "mapper",
        "description": "Mapstruct Mapper Class"
    },
    {
        "location": "src/main/java/com/testbed/accountapi/service/AccountService.java",
        "projectFileType": "service",
        "description": "Spring Boot Service Class"
    },
    {
        "location": "src/main/java/com/testbed/accountapi/controller/AccountController.java",
        "projectFileType": "controller",
        "description": "Spring Boot Controller Class"
    },
    {
        "location": "src/main/java/com/testbed/accountapi/exception/AccountNotFoundException.java",
        "projectFileType": "exception",
        "description": "Spring Boot Exception Class"
    },
    {
        "location": "src/main/java/com/testbed/accountapi/integration/customerapi/Customer.java",
        "projectFileType": "integration-model",
        "description": "Spring Boot Model Class"
    },
    {
        "location": "src/main/java/com/testbed/accountapi/integration/customerapi/CustomerApiClient.java",
        "projectFileType": "integration-client",
        "description": "Open Feign Client Class"
    },
    {
        "location": "src/test/java/com/testbed/accountapi/integration/customerapi/CustomerApiClientTest.java",
        "projectFileType": "integration-test",
        "description": "Feign Client Test Class"
    },
    {
        "location": "src/main/resources/application.yml",
        "projectFileType": "application-properties",
        "description": "Spring Boot Application Configuration"
    },
    {
        "location": "src/test/java/com/testbed/accountapi/controller/AccountControllerTest.java",
        "projectFileType": "controller-test",
        "description": "Controller Test Class"
    },
    {
        "location": "src/test/java/com/testbed/accountapi/service/AccountServiceTest.java",
        "projectFileType": "service-test",
        "description": "Service Test Class"
    },
    {
        "location": "src/test/resources/application.yml",
        "projectFileType": "test-properties",
        "description": "Spring Boot Test Configuration"
    }]
}
```