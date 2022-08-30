const MOCK_DATA_STRING_LENGTH_MIN = 3;
const MOCK_DATA_STRING_LENGTH_MAX = 7;

export const PATH_ENTRIES = [
  // override policy
  {
    path: "/apis/policy.karmada.io/v1alpha1/overridepolicies",
    method: "get",
    status: "200"
  },
  // cluster override policy
  {
    path: "/apis/policy.karmada.io/v1alpha1/clusteroverridepolicies",
    method: "get",
    status: "200"
  },
  // work
  {
    path: "/apis/work.karmada.io/v1alpha1/works",
    method: "get",
    status: "200"
  },
  // cluster resource binding
  {
    path: "/apis/work.karmada.io/v1alpha2/clusterresourcebindings",
    method: "get",
    status: "200"
  },
  // namespace resource binding
  {
    path: "/apis/work.karmada.io/v1alpha2/resourcebindings",
    method: "get",
    status: "200"
  }
];

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

function generateRandomString(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function createResponse(entry, definitions, paths) {
  const res = {
    status: parseInt(entry.status),
    data: createSchema(
      paths[entry.path][entry.method]["responses"][entry.status]["schema"][
        "$ref"
      ],
      definitions
    )
  };
  return res;
}

function createSchema(ref, definitions) {
  if (ref) {
    ref = ref.replace("#/definitions/", "");
  }
  const def = definitions[ref];
  if (def.type === "object") {
    const obj = {};
    if (def.properties) {
      Object.entries(def.properties).forEach(([key, property]) => {
        if (property.type) {
          if (property.type === "array") {
            if (property.items["$ref"]) {
              obj[key] = [
                createSchema(property.items["$ref"], definitions),
                createSchema(property.items["$ref"], definitions),
                createSchema(property.items["$ref"], definitions)
              ];
            } else {
              if (property.items["type"] === "string")
                // obj[key] = property.description;
                obj[key] = generateRandomString(
                  getRandomIntInclusive(
                    MOCK_DATA_STRING_LENGTH_MIN,
                    MOCK_DATA_STRING_LENGTH_MAX
                  )
                );
            }
          } else if (property.type === "string") {
            // obj[key] = property.description;
            obj[key] = generateRandomString(
              getRandomIntInclusive(
                MOCK_DATA_STRING_LENGTH_MIN,
                MOCK_DATA_STRING_LENGTH_MAX
              )
            );
          } else if (property.type === "integer") {
            obj[key] = 1;
          } else if (property.type === "boolean") {
            obj[key] = true;
          }
        } else if (property["$ref"]) {
          obj[key] = createSchema(property["$ref"], definitions);
        } else {
          console.log(property);
        }
      });
      return obj;
    } else {
      // return def.description;
      return generateRandomString(5);
    }
  } else {
    // return def.description;
    return generateRandomString(5);
  }
}

export function createMockData(entries = PATH_ENTRIES, definitions, paths) {
  return entries.map((entry) => createResponse(entry, definitions, paths));
}
