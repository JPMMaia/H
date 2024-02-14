cmake_minimum_required(VERSION 3.20)

project(H)

include(CTest)

if (MSVC)
    add_compile_options("/EHsc")
endif ()

add_subdirectory("Tools/code_generator")
add_subdirectory("Source")
add_subdirectory("Application")
add_subdirectory("Tests")
add_subdirectory("Examples")

add_custom_target(
    Generate_code_after_core_update DEPENDS
        Generate_json_serializer_code
        Generate_h_core_reflection_json
        Generate_h_core_typescript_interface
        Generate_h_core_typescript_intermediate_representation
)
