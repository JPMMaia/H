add_executable(Minimal)

target_compile_features(Minimal PRIVATE cxx_std_23)

target_link_libraries(Minimal PUBLIC H::Core H::Compiler)

target_sources(Minimal PRIVATE
    "Minimal.cpp"
)
