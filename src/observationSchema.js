const observationSchema = {
  fields: [
    {
      id: "Roof Type",
      label: "Roof Type",
      type: "string",
      options: ["Class A", "Class B", "Class C", "Class D"]
    },
    {
      id: "Wildfire Risk Category",
      label: "Wildfire Risk Category",
      type: "string",
      options: ["A", "B", "C", "D"]
    },
    {
      id: "Window Type",
      label: "Window Type",
      type: "string",
      options: ["Single", "Double", "Tempered Glass"]
    },
    {
      id: "Attic Vent has Screens",
      label: "Attic Vent has Screens",
      type: "string",
      options: ["True", "False"]
    },
    {
      id: "Vegetation",
      label: "Vegetation",
      type: "array",
      itemFields: [
        {
          id: "Type",
          label: "Type",
          type: "string",
          options: ["Tree", "Shrub", "Grass"]
        },
        {
          id: "Distance to Window",
          label: "Distance to Window (ft)",
          type: "number"
        }
      ]
    }
  ]
};

export default observationSchema; 