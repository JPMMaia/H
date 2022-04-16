add_library(H_Tools_Code_generator)
add_library(H::Tools::Code_generator ALIAS H_Tools_Code_generator)

target_compile_features(H_Tools_Code_generator PUBLIC cxx_std_23)

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
    OUTPUT "${H_ROOT_DIR}/Source/JSON_serializer/Read_json.cppm"
    COMMAND H_Tools_Generate_JSON
                ARGS
                "read"
                "h.json_serializer.read_json"
                "${H_ROOT_DIR}/Source/Core/Core.cppm"
                "${H_ROOT_DIR}/Source/JSON_serializer/Read_json.cppm"
    MAIN_DEPENDENCY "${H_ROOT_DIR}/Source/Core/Core.cppm"
    DEPENDS H_Tools_Generate_JSON
)
add_custom_target(Generate_read_json_code DEPENDS "${H_ROOT_DIR}/Source/JSON_serializer/Read_json.cppm")


add_custom_command(
    OUTPUT "${H_ROOT_DIR}/Source/JSON_serializer/Write_json.cppm"
    COMMAND H_Tools_Generate_JSON
                ARGS
                "write"
                "h.json_serializer.write_json"
                "${H_ROOT_DIR}/Source/Core/Core.cppm"
                "${H_ROOT_DIR}/Source/JSON_serializer/Write_json.cppm"
    MAIN_DEPENDENCY "${H_ROOT_DIR}/Source/Core/Core.cppm"
    DEPENDS H_Tools_Generate_JSON
)
add_custom_target(Generate_write_json_code DEPENDS "${H_ROOT_DIR}/Source/JSON_serializer/Write_json.cppm")


add_custom_command(
    OUTPUT "${H_ROOT_DIR}/Source/JSON_serializer/Operators.cppm"
    COMMAND H_Tools_Generate_JSON
                ARGS
                "operators"
                "h.json_serializer.operators"
                "${H_ROOT_DIR}/Source/Core/Core.cppm"
                "${H_ROOT_DIR}/Source/JSON_serializer/Operators.cppm"
    MAIN_DEPENDENCY "${H_ROOT_DIR}/Source/Core/Core.cppm"
    DEPENDS H_Tools_Generate_JSON
)
add_custom_target(Generate_json_operators_code DEPENDS "${H_ROOT_DIR}/Source/JSON_serializer/Operators.cppm")

add_custom_target(Generate_json_code DEPENDS Generate_read_json_code Generate_write_json_code Generate_json_operators_code)