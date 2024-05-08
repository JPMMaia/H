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
    COMMENT "Run Webpack on Parser"
)

add_custom_target(Parser DEPENDS "${CMAKE_CURRENT_BINARY_DIR}/js/dist/main.js")

set_property(GLOBAL PROPERTY parser_javascript_location "${CMAKE_CURRENT_BINARY_DIR}/js/dist/main.js")

macro(copy_parser_javascript_to_folder target)

    get_property(parser_javascript_location GLOBAL PROPERTY parser_javascript_location)

    set(destination_directory "$<TARGET_FILE_DIR:${target}>")

    add_custom_command(
        TARGET "${target}"
        POST_BUILD
        COMMAND "${CMAKE_COMMAND}" "-E" "copy_if_different" "${parser_javascript_location}" "${destination_directory}/parser.js"
        VERBATIM
        COMMENT "Copy ${parser_javascript_location} to ${destination_directory}/parser.js"
    )

endmacro()


add_library(H_parser)
add_library(H::Parser ALIAS H_parser)

target_compile_features(H_parser PRIVATE cxx_std_23)

target_link_libraries(H_parser PUBLIC H::Common)

target_sources(H_parser PRIVATE
   "Parser.cppm"
   "Parser.cpp"
)


add_executable(H_parser_executable)
add_executable(H::Parser_executable ALIAS H_parser_executable)

set_target_properties(H_parser_executable PROPERTIES OUTPUT_NAME "hlang_parser")

target_compile_features(H_parser_executable PRIVATE cxx_std_23)

target_link_libraries(H_parser_executable PRIVATE H::Common H::Parser)

find_package(docopt REQUIRED CONFIG)
target_link_libraries(H_parser_executable PRIVATE docopt)

target_sources(H_parser_executable PRIVATE
   "main.cpp"
)

install(TARGETS H_parser_executable)

copy_parser_javascript_to_folder(H_parser_executable)
