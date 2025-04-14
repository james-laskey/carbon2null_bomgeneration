import json

# Function to normalize data and create training format
def normalize_and_format_training_data(input_data):
    # Define default structure for uniformity
    default_structure = {
        "product": {
            "name": "",
            "description": "",
            "total_cost": "",
            "components": []
        },
        "lifecycle_assessment": {
            "raw_material_extraction": {
                "origin": "",
                "environmental_impact": "",
                "renewable_resource": ""
            },
            "manufacturing_processes": {
                "energy_consumption": "",
                "emissions": "",
                "waste_generated": ""
            },
            "transportation": {
                "carbon_footprint": "",
                "logistics_efficiency": ""
            },
            "usage_phase": {
                "impact": "",
                "energy_efficiency": "",
                "maintenance_requirements": ""
            },
            "end_of_life_disposal": {
                "recyclability": "",
                "reuse_opportunities": "",
                "disposal_impact": ""
            },
            "environmental_indicators": {
                "greenhouse_gas_emissions": "",
                "water_usage": "",
                "ecological_footprint": ""
            }
        }
    }

    formatted_data = []
    
    for item in input_data:
        # Access the nested data under the "0" key
        nested_item = item.get("0", {})

        # Start with the default structure
        normalized_item = json.loads(json.dumps(default_structure))  # Deep copy

        # Fill in available fields from the nested data
        product_data = nested_item.get("product", {})
        normalized_item["product"]["name"] = product_data.get("name", "")
        normalized_item["product"]["description"] = product_data.get("description", "")
        normalized_item["product"]["total_cost"] = product_data.get("total_cost", "")
        
        # Process components
        components = product_data.get("components", [])
        for component in components:
            normalized_component = {
                "component_name": component.get("component_name", ""),
                "part_number": component.get("part_number", ""),
                "quantity": component.get("quantity", ""),
                "unit_of_measurement": component.get("unit_of_measurement", ""),
                "specifications": {
                    "dimensions": component.get("specifications", {}).get("dimensions", ""),
                    "weight": component.get("specifications", {}).get("weight", ""),
                    "material_type": component.get("specifications", {}).get("material_type", "")
                },
                "supplier": {
                    "name": component.get("supplier", {}).get("name", ""),
                    "location": component.get("supplier", {}).get("location", "")
                },
                "cost": {
                    "unit_cost": component.get("cost", {}).get("unit_cost", ""),
                    "total_cost": component.get("cost", {}).get("total_cost", "")
                },
                "assembly_instructions": component.get("assembly_instructions", "")
            }
            normalized_item["product"]["components"].append(normalized_component)

        # Process LCA data
        lca_data = nested_item.get("lifecycle_assessment", {})
        normalized_item["lifecycle_assessment"]["raw_material_extraction"] = lca_data.get("raw_material_extraction", {})
        normalized_item["lifecycle_assessment"]["manufacturing_processes"] = lca_data.get("manufacturing_processes", {})
        normalized_item["lifecycle_assessment"]["transportation"] = lca_data.get("transportation", {})
        normalized_item["lifecycle_assessment"]["usage_phase"] = lca_data.get("usage_phase", {})
        normalized_item["lifecycle_assessment"]["end_of_life_disposal"] = lca_data.get("end_of_life_disposal", {})
        normalized_item["lifecycle_assessment"]["environmental_indicators"] = lca_data.get("environmental_indicators", {})

        # Create training format
        product_name = normalized_item["product"]["name"]
        formatted_item = {
            "prompt": f"generate a bill of materials (BOM) for '{product_name}'.",
            "response": normalized_item["product"]
        }
        
        formatted_data.append(formatted_item)

    return formatted_data


# Load JSON file
input_file = "research_boms_output.json"  # Replace with your file name
output_file = "normalized_output.json"  # Replace with your desired output file name

with open(input_file, "r") as file:
    input_data = json.load(file)

# Parse and normalize the data
normalized_output = normalize_and_format_training_data(input_data)

# Save the output to a new JSON file
with open(output_file, "w") as file:
    json.dump(normalized_output, file, indent=4)

print(f"Normalized data saved to {output_file}")