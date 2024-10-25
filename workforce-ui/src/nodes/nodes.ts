import { Node } from "reactflow";
import { BaseConfig, ConfigFactory, ObjectSubtype, ObjectType } from "workforce-core/model";
import { CustomNodeData, NodeDataFactory } from "./nodeData";


export function NewObjectNode<TConfig extends BaseConfig>(position: { x: number, y: number }, orgId: string, type: ObjectType, subtype: ObjectSubtype, config?: TConfig): Node<CustomNodeData<TConfig>> {
    const cfg = config ?? ConfigFactory.defaultConfigFor(orgId, type, subtype) as TConfig;
    const data = NodeDataFactory.create<TConfig>(cfg, type);
    return {
        id: cfg.id,
        type: type,
        position: position,
        data: data as CustomNodeData<TConfig>
    }
}