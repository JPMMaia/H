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


add_library(H_parser)
add_library(H::Parser ALIAS H_parser)

target_compile_features(H_parser PRIVATE cxx_std_23)

target_link_libraries(H_parser PUBLIC H::Common)

if (WIN32)
   find_package(unofficial-tree-sitter CONFIG REQUIRED)
   target_link_libraries(H_parser PRIVATE unofficial::tree-sitter::tree-sitter)
else ()
   find_library(TREE_SITTER_LIBRARY tree-sitter REQUIRED)
   target_link_libraries(H_parser PRIVATE ${TREE_SITTER_LIBRARY})
endif()

target_sources(H_parser
   PUBLIC FILE_SET modules TYPE CXX_MODULES
      FILES
         "Parser.cppm"
   PRIVATE
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
