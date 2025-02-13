/**
 * @file Hlang grammar for tree-sitter
 * @author João Maia <jpmmaia@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "hlang",

  rules: {
    Module: $ => seq($.Module_head, repeat($.Declaration)),
    Module_head: $ => seq($.Module_declaration, repeat($.Import)),
    Module_declaration: $ => seq(optional($.Comment), "module", $.Module_name, ";"),
    Module_name: $ => $.Identifier_with_dots,
    Import: $ => seq("import", $.Import_name, "as", $.Import_alias, ";"),
    Import_name: $ => $.Identifier_with_dots,
    Import_alias: $ => $.Identifier,
    Declaration: $ => seq(optional($.Comment), optional("export"), choice($.Struct)),
    Type: $ => choice($.Builtin_type, $.Type_name),
    Type_name: $ => $.Identifier,
    Builtin_type: $ => choice("Float16", "Float32", "Float64", "Bool", "String", $.Integer_type),
    Integer_type: $ => /(Int|Uint)([1-9]|[1-5][0-9]|6[0-4])/,
    Struct: $ => seq("struct", $.Struct_name, "{", repeat($.Struct_member), "}"),
    Struct_name: $ => $.Identifier,
    Struct_member: $ => seq(optional($.Comment), $.Struct_member_name, ":", $.Struct_member_type, "=", $.Generic_expression_or_instantiate, ";"),
    Struct_member_name: $ => $.Identifier,
    Struct_member_type: $ => $.Type,
    Generic_expression_or_instantiate: $ => choice($.Generic_expression, $.Expression_instantiate),
    Generic_expression: $ => choice($.Expression_constant),
    Expression_constant: $ => choice($.Boolean, $.Number, $.String),
    Expression_instantiate: $ => seq("{}"), // TODO
    Identifier: $ => /[a-zA-Z_]+/,
    Identifier_with_dots: $ => seq($.Identifier, repeat(seq(".", $.Identifier))),
    Boolean: $ => choice("true", "false"),
    Number: $ => /\d+/, // TODO suffix
    String: $ => /".*"/, // TODO suffix
    Comment: $ => token(seq("//", /.*/)),
  }
});
