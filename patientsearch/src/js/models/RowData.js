class RowData {
  constructor(data) {
    this.data = data;
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

  get activeFlag() {
    if (!this.data) return null;
    if ("active" in this.data) return this.data["active"];
    return null;
  }
  set activeFlag(value) {
    if (!this.data) return null;
    this.data["active"] = value;
  }
  getFhirData() {
    if (!this.data) return null;
    if (this.data.resource) return this.data.resource;
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
    if (this.activeFlag) {
      fhirData = {
        ...fhirData,
        active: this.activeFlag,
      };
    }
    return fhirData;
  }
  getData() {
    return this.data;
  }
  getFilters() {
    return [
      {
        field: "first_name",
        value: this.firstName,
      },
      {
        field: "last_name",
        value: this.lastName,
      },
      {
        field: "birth_date",
        value: this.birthDate,
      },
    ];
  }
  static create(firstName = "", lastName = "", birthDate = "") {
    return new RowData({
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
    });
  }
}
export default RowData;
