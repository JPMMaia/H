add_library(H_binary_serializer)
add_library(H::Binary_serializer ALIAS H_binary_serializer)

target_compile_features(H_binary_serializer PUBLIC cxx_std_23)

target_link_libraries(H_binary_serializer PUBLIC H::Common H::Core)

target_sources(H_binary_serializer
    PUBLIC FILE_SET modules TYPE CXX_MODULES
        FILES
            "Binary_serializer.cppm"
            "Generated.cppm"
            "Generics.cppm"
)

add_dependencies(H_binary_serializer H_Binary_serializer_generate)

if(BUILD_TESTING)
   add_executable(H_binary_serializer_tests)
   target_link_libraries(H_binary_serializer_tests PRIVATE H_binary_serializer)

   find_package(Catch2 CONFIG REQUIRED)
   target_link_libraries(H_binary_serializer_tests PRIVATE Catch2::Catch2WithMain)

   target_sources(H_binary_serializer_tests PRIVATE "Binary_serializer.tests.cpp")

   include(Catch)
   catch_discover_tests(H_binary_serializer_tests)
endif()
