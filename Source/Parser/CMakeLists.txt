set(PARSER_SOURCE_PATH "${CMAKE_SOURCE_DIR}/Tools/vscode/H-editor/src")

add_custom_command(
    OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/node_modules/.package-lock.json"
    COMMAND "npm"
    ARGS
        "install"
        "fast-array-diff"
        "--prefix" "${CMAKE_CURRENT_BINARY_DIR}"
    WORKING_DIRECTORY "${PARSER_SOURCE_PATH}/application"
    VERBATIM
    COMMENT "Install Parser dependencies"
)

add_custom_command(
    OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/application/Application.js"
    COMMAND "tsc"
    ARGS
        "-p" "${PARSER_SOURCE_PATH}/application/tsconfig.json"
        "--outDir" "${CMAKE_CURRENT_BINARY_DIR}"
    VERBATIM
    DEPENDS "${PARSER_SOURCE_PATH}/application/*.ts" "${PARSER_SOURCE_PATH}/core/*.ts"
    COMMENT "Compiling Parser from Typescript to Javascript"
)

add_custom_target(Parser DEPENDS "${CMAKE_CURRENT_BINARY_DIR}/node_modules/.package-lock.json" "${CMAKE_CURRENT_BINARY_DIR}/application/Application.js")
