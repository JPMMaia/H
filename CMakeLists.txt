cmake_minimum_required(VERSION 3.20)

project(H)

include(CTest)

if (MSVC)
    add_compile_options("/EHsc")
endif ()

add_subdirectory("Source")
add_subdirectory("Application")
add_subdirectory("Tools/code_generator")
add_subdirectory("Tests")

