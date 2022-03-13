add_library(H_editor)
add_library(H::Editor ALIAS H_editor)

target_compile_features(H_editor PRIVATE cxx_std_23)

target_link_libraries(H_editor PRIVATE H::Core)

target_sources(H_editor PRIVATE
   "Editor.cppm"
   "Editor.cpp"
)


if(BUILD_TESTING)
   add_executable(H_editor_tests)
   target_link_libraries(H_editor_tests PRIVATE H_editor)

   find_package(Catch2 CONFIG REQUIRED)
   target_link_libraries(H_editor_tests PRIVATE Catch2::Catch2)

   target_sources(H_editor_tests PRIVATE "Editor.tests.cpp")

   include(Catch)
   catch_discover_tests(H_editor_tests)
endif()
