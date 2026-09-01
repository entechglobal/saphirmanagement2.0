export default class ApiFeatures {
  constructor(queryString) {
    this.queryString = queryString;

    this.where = {};
    this.orderBy = { createdAt: "desc" };
    this.select = undefined;
    this.paginationResult = {};
    this.skip = 0;
    this.take = 5;
  }

  /* ===============================
     FILTER (gte, gt, lte, lt, in)
  =============================== */
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields", "keyword"];
    excludedFields.forEach((el) => delete queryObj[el]);
    Object.keys(queryObj).forEach((field) => {
      if (typeof queryObj[field] === "object") {
        this.where[field] = {};
        Object.keys(queryObj[field]).forEach((op) => {
          this.where[field][op] = queryObj[field][op];
        });
      } else {
        this.where[field] = queryObj[field];
      }
    });
    return this;
  }

  /* ===============================
     SEARCH
  =============================== */
  search(fields = [""]) {
    if (this.queryString.keyword) {
      this.where.OR = fields.map((field) => ({
        [field]: {
          contains: this.queryString.keyword,
        },
      }));
    }
    return this;
  }

  /* ===============================
     SORT
  =============================== */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").map((field) => {
        if (field.startsWith("-")) {
          return { [field.substring(1)]: "desc" };
        }
        return { [field]: "asc" };
      });
      this.orderBy = sortBy;
    }
    return this;
  }

  /* ===============================
     FIELD LIMITING
  =============================== */
  limitFields(defaultSelect) {
    if (this.queryString.fields) {
      this.select = {};
      this.queryString.fields.split(",").forEach((field) => {
        this.select[field] = true;
      });
    } else {
      this.select = defaultSelect;
    }
    return this;
  }

  /* ===============================
     PAGINATION
  =============================== */
  paginate(countDocuments) {
    const page = Number(this.queryString.page) || 1;
    const limit = Number(this.queryString.limit) || 5;

    this.skip = (page - 1) * limit;
    this.take = limit;

    this.paginationResult = {
      currentPage: page,
      limit,
      numberOfPages: Math.ceil(countDocuments / limit),
    };

    if (page * limit < countDocuments) {
      this.paginationResult.next = page + 1;
    }
    if (page > 1) {
      this.paginationResult.prev = page - 1;
    }

    return this;
  }

  /* ===============================
     BUILD PRISMA QUERY
  =============================== */
  build() {
    return {
      where: this.where,
      orderBy: this.orderBy,
      select: this.select,
      skip: this.skip,
      take: this.take,
    };
  }
}
