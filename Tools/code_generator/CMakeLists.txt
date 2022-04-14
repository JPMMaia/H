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