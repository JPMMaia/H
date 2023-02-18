export enum Token {
    Code_block,
    Code_block_close_keyword,
    Code_block_open_keyword,
    Expression_binary_operation,
    Expression_binary_operation_keyword,
    Expression_constant,
    Expression_defer,
    Expression_defer_keyword,
    Expression_return,
    Expression_return_keyword,
    Expression_variable_declaration,
    Expression_variable_declaration_assignment,
    Expression_variable_declaration_keyword,
    Expression_variable_declaration_name,
    Expression_variable_reference,
    Function,
    Function_declaration,
    Function_declaration_keyword,
    Function_declaration_input_parameters,
    Function_declaration_name,
    Function_declaration_output_parameters,
    Function_declaration_parameters_separator,
    Function_parameter,
    Function_parameter_name,
    Function_parameter_separator,
    Function_parameter_type,
    Function_parameters_close_keyword,
    Function_parameters_open_keyword,
    Function_parameters_separator,
    Module,
    Module_body,
    Statement,
    Statement_end,
}

export interface Cache {
    relative_start: number;
}

export interface Node {
    value: string;
    token: Token;
    children: Node[];
    cache: Cache;
}

export function find_node_position(root: Node, offset: number): number[] {
    throw Error("Not implemented!");
    return [];
}

export function find_node_common_root(first_position: number[], second_position: number[]): number[] {
    throw Error("Not implemented!");
    return [];
}

export function get_node_at_position(root: Node, position: number[]): Node {
    throw Error("Not implemented!");
    return root;
}

export function find_node_range(root: Node, position: number[]): { start: number, end: number } {
    throw Error("Not implemented!");
    return {
        start: 0,
        end: 0
    };
}

export function find_top_level_node_position(root: Node, position: number[]): number[] {
    throw Error("Not implemented!");
    // TODO find statement, code block, function declaration, function, module
    return [];
}