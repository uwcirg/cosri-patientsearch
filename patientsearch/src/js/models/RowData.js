class RowData {
  constructor(data) {
    this.data = data || {};
  }

  get firstName() {
    if (!this.data) return "";
    return this.data["first_name"];
  }

  set firstName(value) {
    this.data["first_name"] = value;
  }

  get lastName() {
    if (!this.data) return "";
    return this.data["last_name"];
  }

  set lastName(value) {
    this.data["last_name"] = value;
  }

  get birthDate() {
    if (!this.data) return null;
    return this.data["birth_date"];
  }

  set birthDate(value) {
    this.data["birth_date"] = value;
  }

  get telephone() {
    if (!this.data) return "";
    return this.data["telephone"];
  }

  set telephone(value) {
    this.data["telephone"] = value;
  }

  get activeFlag() {
    if (!this.data) return null;
    if ("active" in this.data) return this.data["active"];
    return null;
  }

  set activeFlag(value) {
    if (this.data) this.data["active"] = value;
  }

  // Generic getter for any field
  getField(fieldName) {
    if (!this.data) return null;
    return this.data[fieldName];
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
      // eslint-disable-next-line
      .filter(([key, value]) => {
        return value !== null && value !== "";
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

  // @params[fields] an object of field-value pairs
  static create(fields = {}) {
    // Support legacy positional arguments
    if (typeof fields === "string") {
      const [firstName, lastName, birthDate, telephone] = arguments;
      return new RowData({
        first_name: firstName || "",
        last_name: lastName || "",
        birth_date: birthDate || "",
        ...(telephone && { telephone }),
      });
    }
    return new RowData(fields);
  }

  // Helper to create from filter configuration
  static createFromFields(fieldConfigs, values) {
    const data = {};
    fieldConfigs.forEach((config) => {
      if (values[config.name] !== undefined) {
        data[config.name] = values[config.name];
      }
    });
    return new RowData(data);
  }
}

export default RowData;
