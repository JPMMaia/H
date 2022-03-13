add_library(Hcompiler)

target_compile_features(Hcompiler PRIVATE cxx_std_20)

target_link_libraries(Hcompiler PRIVATE HCore)

target_sources(Hcompiler PRIVATE "main.cpp")
