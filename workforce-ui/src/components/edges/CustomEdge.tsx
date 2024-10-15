import { BaseEdge, BezierEdge, EdgeProps } from "reactflow";

export function CustomEdge(props: EdgeProps) {
   
    if (props.sourceX < props.targetX) {
        return <BezierEdge {...props} />
    }

    const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd } = props;   
    
    const distanceX = Math.abs(sourceX - targetX);
    const distanceY = Math.abs(sourceY - targetY);
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    const curveWidth = distance * 0.5;
    const edgePath = `M ${sourceX} ${sourceY} C ${sourceX + curveWidth} ${sourceY - curveWidth} ${targetX - curveWidth} ${targetY - curveWidth} ${targetX} ${targetY}`;
    
    
    return <BaseEdge path={edgePath} markerEnd={markerEnd}/>
}