
class RowData {
  constructor(data) {
    this.data = data || {};
  }

  // Flexible getters that handle multiple naming conventions
  get firstName() {
    return (
      this.data["first_name"] ||
      this.data["firstName"] ||
      this.data["given"] ||
      ""
    );
  }

  set firstName(value) {
    this.data["first_name"] = value;
    this.data["firstName"] = value;
  }

  get lastName() {
    return (
      this.data["last_name"] ||
      this.data["lastName"] ||
      this.data["name"] ||
      this.data["family"] ||
      ""
    );
  }

  set lastName(value) {
    this.data["last_name"] = value;
    this.data["lastName"] = value;
  }

  get birthDate() {
    return (
      this.data["birth_date"] ||
      this.data["birthDate"] ||
      this.data["birthdate"] ||
      null
    );
  }

  set birthDate(value) {
    this.data["birth_date"] = value;
    this.data["birthDate"] = value;
  }

  get telephone() {
    return (
      this.data["telephone"] || this.data["telecom"] || this.data["phone"] || ""
    );
  }

  set telephone(value) {
    this.data["telephone"] = value;
    this.data["telecom"] = value;
  }

  get activeFlag() {
    if (!this.data) return null;
    if ("active" in this.data) return this.data["active"];
    return null;
  }

  set activeFlag(value) {
    if (this.data) this.data["active"] = value;
  }

  // Generic getter for any field - with fallback support
  getField(fieldName) {
    if (!this.data) return null;

    // Try direct access first
    if (this.data[fieldName] !== undefined) {
      return this.data[fieldName];
    }

    // Try using getter if it exists
    if (this[fieldName] !== undefined) {
      return this[fieldName];
    }

    return null;
  }

  // Generic setter for any field
  setField(fieldName, value) {
    if (!this.data) this.data = {};
    this.data[fieldName] = value;
  }

  getFhirData(createNew) {
    if (!this.data) return null;
    if (!createNew && this.data.resource) return this.data.resource;

    let fhirData = {
      resourceType: "Patient",
      name: [
        {
          family: this.lastName ? this.lastName.trim() : "",
          given: [this.firstName ? this.firstName.trim() : ""],
        },
      ],
      birthDate: this.birthDate,
    };

    // Add telecom if telephone exists
    if (this.telephone) {
      fhirData.telecom = [
        {
          system: "phone",
          value: this.telephone.trim(),
          use: "mobile",
        },
      ];
    }

    return fhirData;
  }

  getData() {
    return this.data;
  }

  getFilters() {
    if (!this.data) return [];

    // Dynamically create filters from all data fields
    return Object.entries(this.data)
      .filter(([key, value]) => {
        // Exclude 'active' and 'resource' from filters
        return (
          key !== "active" &&
          key !== "resource" &&
          value !== null &&
          value !== ""
        );
      })
      .map(([field, value]) => ({
        field,
        value,
      }));
  }

  // Get filters only for specific fields
  getFiltersByFields(fieldNames) {
    if (!this.data) return [];

    return fieldNames
      .map((fieldName) => ({
        field: fieldName,
        value: this.data[fieldName],
      }))
      .filter((filter) => filter.value !== null && filter.value !== "");
  }

  // Static create method - accepts object of field-value pairs
  static create(fields = {}) {
    // Support positional arguments
    if (typeof fields === "string") {
      // signature: create(firstName, lastName, birthDate, telephone)
      const [firstName, lastName, birthDate, telephone] = arguments;
      return new RowData({
        first_name: firstName || "",
        firstName: firstName || "",
        last_name: lastName || "",
        lastName: lastName || "",
        birth_date: birthDate || "",
        birthDate: birthDate || "",
        ...(telephone && { telephone, telecom: telephone }),
      });
    }

    // signature: create({ firstName: "John", lastName: "Doe", ... })
    return new RowData(fields);
  }

  // Helper to create from filter configuration
  static createFromFields(fieldConfigs, values) {
    const data = {};
    fieldConfigs.forEach((config) => {
      // Use the resolved dataKey from processFieldConfig
      const dataKey = config.dataKey || config.name;
      if (
        values[config.name] !== undefined &&
        values[config.name] !== null &&
        values[config.name] !== ""
      ) {
        data[dataKey] = values[config.name];
      }
    });
    return new RowData(data);
  }
}

export default RowData;
