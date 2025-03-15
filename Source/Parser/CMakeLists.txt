set(VSCODE_EXTENSION_SOURCE_PATH "${CMAKE_SOURCE_DIR}/Tools/vscode/H-editor")
set(PARSER_SOURCE_PATH "${CMAKE_SOURCE_DIR}/Tools/vscode/H-editor/packages")

set(PARSER_JAVASCRIPT_DIRECTORY_LOCATION "${VSCODE_EXTENSION_SOURCE_PATH}/dist")
set(PARSER_JAVASCRIPT_LOCATION "${VSCODE_EXTENSION_SOURCE_PATH}/dist/parser.js")

set_property(GLOBAL PROPERTY parser_javascript_location "${PARSER_JAVASCRIPT_LOCATION}")

install(
    FILES "${PARSER_JAVASCRIPT_LOCATION}"
    TYPE BIN
    RENAME "parser.js"
)

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

find_package(unofficial-tree-sitter CONFIG REQUIRED)
target_link_libraries(H_parser PRIVATE unofficial::tree-sitter::tree-sitter)

target_sources(H_parser PRIVATE
   "Parser.cppm"
   "Parser.cpp"
)


add_executable(H_parser_executable)
add_executable(H::Parser_executable ALIAS H_parser_executable)

set_target_properties(H_parser_executable PROPERTIES OUTPUT_NAME "hlang_parser")

target_compile_features(H_parser_executable PRIVATE cxx_std_23)

target_link_libraries(H_parser_executable PRIVATE H::Common H::Parser)

find_package(argparse CONFIG REQUIRED)
target_link_libraries(H_parser_executable PRIVATE argparse::argparse)

target_sources(H_parser_executable PRIVATE
   "main.cpp"
)

install(TARGETS H_parser_executable)

copy_parser_javascript_to_folder(H_parser_executable)
