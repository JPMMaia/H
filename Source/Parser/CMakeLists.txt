set(PARSER_SOURCE_PATH "${CMAKE_SOURCE_DIR}/Tools/vscode/H-editor/src")

add_custom_command(
    OUTPUT
        "${CMAKE_CURRENT_BINARY_DIR}/js/application/package.json.in"
        "${CMAKE_CURRENT_BINARY_DIR}/js/application/tsconfig.json.in"
        "${CMAKE_CURRENT_BINARY_DIR}/js/application/webpack.config.js.in"
    COMMAND "${CMAKE_COMMAND}" "-E" "copy_directory" "${PARSER_SOURCE_PATH}" "${CMAKE_CURRENT_BINARY_DIR}/js"
    DEPENDS
        "${PARSER_SOURCE_PATH}/application/*.ts"
        "${PARSER_SOURCE_PATH}/application/*.json.in"
        "${PARSER_SOURCE_PATH}/application/*.js.in"
        "${PARSER_SOURCE_PATH}/core/*.ts"
    VERBATIM
    COMMENT "Copy Parser source"
)

add_custom_command(
    OUTPUT
        "${CMAKE_CURRENT_BINARY_DIR}/js/package.json"
        "${CMAKE_CURRENT_BINARY_DIR}/js/tsconfig.json"
        "${CMAKE_CURRENT_BINARY_DIR}/js/webpack.config.js"
    COMMAND "${CMAKE_COMMAND}" "-E" "copy" "${CMAKE_CURRENT_BINARY_DIR}/js/application/package.json.in" "${CMAKE_CURRENT_BINARY_DIR}/js/package.json"
    COMMAND "${CMAKE_COMMAND}" "-E" "copy" "${CMAKE_CURRENT_BINARY_DIR}/js/application/tsconfig.json.in" "${CMAKE_CURRENT_BINARY_DIR}/js/tsconfig.json"
    COMMAND "${CMAKE_COMMAND}" "-E" "copy" "${CMAKE_CURRENT_BINARY_DIR}/js/application/webpack.config.js.in" "${CMAKE_CURRENT_BINARY_DIR}/js/webpack.config.js"
    DEPENDS
        "${CMAKE_CURRENT_BINARY_DIR}/js/application/package.json.in"
        "${CMAKE_CURRENT_BINARY_DIR}/js/application/tsconfig.json.in"
        "${CMAKE_CURRENT_BINARY_DIR}/js/application/webpack.config.js.in"
    VERBATIM
    COMMENT "Copy Parser application configuration files"
)

find_program(npm npm REQUIRED)

add_custom_command(
    OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/js/node_modules/.package-lock.json"
    COMMAND "${npm}" "install"
    WORKING_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/js"
    DEPENDS "${CMAKE_CURRENT_BINARY_DIR}/js/package.json"
    VERBATIM
    COMMENT "Install Parser dependencies"
)

add_custom_command(
    OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/js/out/application/Application.js"
    COMMAND "${npm}" "run" "build_tsc"
    WORKING_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/js"
    DEPENDS
        "${CMAKE_CURRENT_BINARY_DIR}/js/node_modules/.package-lock.json"
        "${PARSER_SOURCE_PATH}/application/*.ts"
        "${PARSER_SOURCE_PATH}/application/*.json.in"
        "${PARSER_SOURCE_PATH}/application/*.js.in"
        "${PARSER_SOURCE_PATH}/core/*.ts"
    VERBATIM
    COMMENT "Compile Parser TypeScript to JavaScript"
)

add_custom_command(
    OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/js/dist/main.js"
    COMMAND "${npm}" "run" "build_webpack"
    WORKING_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/js"
    DEPENDS
        "${CMAKE_CURRENT_BINARY_DIR}/js/node_modules/.package-lock.json"
        "${CMAKE_CURRENT_BINARY_DIR}/js/package.json"
        "${CMAKE_CURRENT_BINARY_DIR}/js/tsconfig.json"
        "${CMAKE_CURRENT_BINARY_DIR}/js/webpack.config.js"
        "${PARSER_SOURCE_PATH}/application/*.ts"
        "${PARSER_SOURCE_PATH}/application/*.json.in"
        "${PARSER_SOURCE_PATH}/application/*.js.in"
        "${PARSER_SOURCE_PATH}/core/*.ts"
    VERBATIM
    USES_TERMINAL
    COMMENT "Run Webpack on Parser"
)

add_custom_target(Parser DEPENDS "${CMAKE_CURRENT_BINARY_DIR}/js/dist/main.js")
