add_library(H_builder)
add_library(H::Builder ALIAS H_builder)

target_compile_features(H_builder PRIVATE cxx_std_23)

target_link_libraries(H_builder PUBLIC H::Core H::Common H::Compiler H::C_header_importer H::JSON_serializer H::Parser)

find_package(nlohmann_json CONFIG REQUIRED)
target_link_libraries(H_builder PRIVATE nlohmann_json::nlohmann_json)

target_sources(H_builder PRIVATE
   "Builder.cppm"
   "Builder.cpp"
)


add_executable(H_builder_executable)
add_executable(H::Builder_executable ALIAS H_builder_executable)

set_target_properties(H_builder_executable PROPERTIES OUTPUT_NAME "hlang")

target_compile_features(H_builder_executable PRIVATE cxx_std_23)

target_link_libraries(H_builder_executable PRIVATE H::Builder)

find_package(argparse CONFIG REQUIRED)
target_link_libraries(H_builder_executable PRIVATE argparse::argparse)

target_sources(H_builder_executable PRIVATE
   "main.cpp"
)

install(TARGETS H_builder_executable)

copy_parser_javascript_to_folder(H_builder_executable)
