add_library(H_Tools_Tests_results_replacer)
add_library(H::Tools::Tests_results_replacer ALIAS H_Tools_Tests_results_replacer)

target_compile_features(H_Tools_Tests_results_replacer PUBLIC cxx_std_23)

target_sources(H_Tools_Tests_results_replacer 
    PUBLIC
        FILE_SET CXX_MODULES
        FILES
            "Tests_results_replacer.cppm"
    PRIVATE
        "Tests_results_replacer.cpp"
)


if(BUILD_TESTING)
   add_executable(H_Tools_Tests_results_replacer_tests)
   target_link_libraries(H_Tools_Tests_results_replacer_tests PRIVATE H_Tools_Tests_results_replacer)

   find_package(Catch2 CONFIG REQUIRED)
   target_link_libraries(H_Tools_Tests_results_replacer_tests PRIVATE Catch2::Catch2 Catch2::Catch2WithMain)

   target_sources(H_Tools_Tests_results_replacer_tests PRIVATE "Tests_results_replacer.tests.cpp")

   include(Catch)
   catch_discover_tests(H_Tools_Tests_results_replacer_tests)
endif()


add_executable(H_Tools_Replace_tests_results)
add_executable(H::Tools::Replace_tests_results ALIAS H_Tools_Replace_tests_results)

target_compile_features(H_Tools_Replace_tests_results PUBLIC cxx_std_23)

target_link_libraries(H_Tools_Replace_tests_results PRIVATE H_Tools_Tests_results_replacer)

target_sources(H_Tools_Replace_tests_results PRIVATE
    "main.cpp"
)
