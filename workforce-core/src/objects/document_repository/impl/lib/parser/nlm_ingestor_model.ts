export interface NlmIngestorModel {
    return_dict: NlmReturnDict;
}

export interface NlmReturnDict {
    num_pages: number;
    result: NlmResult;
}

export interface NlmResult {
    blocks: NlmBlock[];
}

export interface NlmBlock {
    block_idx: number;
    level: number;
    page_idx: number;
    tag: string;
    sentences?: string[];
    table_rows?: NlmTableRow[];
}

export interface NlmTableRow {
    cells: NlmTableCell[];
    type: string;
}

export interface NlmTableCell {
    cell_value: string;
}



export const blockTypes = ["header", "hr", "list_item", "numbered_list_item", "para", "table", "table_row"];
export const tableRowTypes = ["table_header", "table_data_row"];