add_library(H_Tools_Code_generator)
add_library(H::Tools::Code_generator ALIAS H_Tools_Code_generator)

target_compile_features(H_Tools_Code_generator PUBLIC cxx_std_23)

find_package(RapidJSON CONFIG REQUIRED)
target_link_libraries(H_Tools_Code_generator PRIVATE rapidjson)

target_sources(H_Tools_Code_generator PRIVATE
    "Code_generator.cppm"
    "Code_generator.cpp"
)


if(BUILD_TESTING)
   add_executable(H_Tools_Code_generator_tests)
   target_link_libraries(H_Tools_Code_generator_tests PRIVATE H_Tools_Code_generator)

   find_package(Catch2 CONFIG REQUIRED)
   target_link_libraries(H_Tools_Code_generator_tests PRIVATE Catch2::Catch2)

   target_sources(H_Tools_Code_generator_tests PRIVATE "Code_generator.tests.cpp")

   include(Catch)
   catch_discover_tests(H_Tools_Code_generator_tests)
endif()


add_executable(H_Tools_Generate_JSON)
add_executable(H::Tools::Generate_JSON ALIAS H_Tools_Generate_JSON)

target_compile_features(H_Tools_Generate_JSON PUBLIC cxx_std_23)

target_link_libraries(H_Tools_Generate_JSON PRIVATE H_Tools_Code_generator)

target_sources(H_Tools_Generate_JSON PRIVATE
    "main.cpp"
)


set(H_ROOT_DIR "${CMAKE_CURRENT_LIST_DIR}/../../")

add_custom_command(
    OUTPUT "${H_ROOT_DIR}/Tools/vscode/H-editor/src/utilities/h_core_reflection.json"
    COMMAND H_Tools_Generate_JSON
                ARGS
                "reflection_json"
                "${H_ROOT_DIR}/Source/Core/Core.cppm"
                "${H_ROOT_DIR}/Tools/vscode/H-editor/src/utilities/h_core_reflection.json"
    DEPENDS H_Tools_Generate_JSON "${H_ROOT_DIR}/Source/Core/Core.cppm"
    VERBATIM
)
add_custom_target(Generate_h_core_reflection_json DEPENDS "${H_ROOT_DIR}/Tools/vscode/H-editor/src/utilities/h_core_reflection.json")

add_custom_command(
    OUTPUT "${H_ROOT_DIR}/Tools/vscode/H-editor/src/utilities/coreModelInterface.ts"
    COMMAND H_Tools_Generate_JSON
                ARGS
                "typescript_interface"
                "${H_ROOT_DIR}/Source/Core/Core.cppm"
                "${H_ROOT_DIR}/Tools/vscode/H-editor/src/utilities/coreModelInterface.ts"
    DEPENDS H_Tools_Generate_JSON "${H_ROOT_DIR}/Source/Core/Core.cppm"
    VERBATIM
)
add_custom_target(Generate_h_core_typescript_interface DEPENDS "${H_ROOT_DIR}/Tools/vscode/H-editor/src/utilities/coreModelInterface.ts")
