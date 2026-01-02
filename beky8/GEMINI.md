# Gemini Customization for This Project

This document provides instructions for the Gemini CLI agent to customize its interactions with this project.

## Interacting with Gemini Models

When you need to interact with Gemini models, please adhere to the following guidelines:

- **Use Existing Classes:** This project has custom classes for interacting with Gemini models, such as `GeminiModel` and `Gemini`. When writing code that calls Gemini, you should prefer to use these existing classes rather than making direct API calls. This will ensure consistency with the project's existing patterns for error handling, retries, and caching.

- **Model Names:** The project uses the following Gemini models:
  - `gemini-1.5-flash`
  - `gemini-2.0-flash-001`
    When using a Gemini model, please use one of these names unless otherwise specified.

- **Schema Conversion:** This project includes utility functions for converting between OpenAPI schemas and Gemini schemas, such as `_to_gemini_schema` and `gemini_to_json_schema`. When working with tool schemas or other data structures that need to be passed to the Gemini API, you should use these functions to ensure that the schemas are in the correct format.

- **API Backend:** Be aware that the project can use either the Gemini API or the Vertex AI backend. The `_api_backend` method in the `Gemini` class determines which backend is used. When making changes to the Gemini integration, please consider how they might affect both backends.

## Code Style and Conventions

- **Typing:** This project uses TypeScript and Python with type hints. Please ensure that any new code you write includes type annotations.
- **Testing:** This project has a `tests` directory and uses `pytest`. When adding new features or fixing bugs, please add corresponding tests.
- **Linting:** This project uses `pylint`. Please run the linter on any new code to ensure that it conforms to the project's coding standards.

By following these instructions, you will help to ensure that your contributions to this project are consistent with its existing architecture and coding style.
