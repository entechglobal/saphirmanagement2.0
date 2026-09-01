import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";

export const createAttributeWithValues = async (data) => {
  // Normalize attribute name to lowercase
  const normalizedName = data.name.toLowerCase().trim();

  // Check if attribute already exists
  const existingAttribute = await prisma.attribute.findUnique({
    where: { name: normalizedName },
  });

  if (existingAttribute) {
    throw new ApiError(`Attribute "${normalizedName}" already exists`, 409);
  }

  // Validate values if provided
  if (data.values && data.values.length > 0) {
    // Normalize values
    const normalizedValues = data.values.map((v) => v.trim());

    // Check for duplicates within the batch
    const uniqueValues = new Set(normalizedValues);
    if (uniqueValues.size !== normalizedValues.length) {
      throw new ApiError("Duplicate values in batch", 400);
    }

    // Check for empty values
    if (normalizedValues.some((v) => v.length === 0)) {
      throw new ApiError("Empty values are not allowed", 400);
    }

    // Create attribute with values in transaction
    return prisma.$transaction(async (tx) => {
      // Create attribute
      const attribute = await tx.attribute.create({
        data: {
          name: normalizedName,
        },
      });

      // Create all values
      await tx.attributeValue.createMany({
        data: normalizedValues.map((value) => ({
          attributeId: attribute.id,
          value,
        })),
      });

      // Fetch complete attribute with values
      return tx.attribute.findUnique({
        where: { id: attribute.id },
        include: {
          values: {
            orderBy: {
              value: "asc",
            },
          },
        },
      });
    });
  }

  // If no values provided, create attribute only
  return prisma.attribute.create({
    data: {
      name: normalizedName,
    },
    include: {
      values: true,
    },
  });
};

/**
 * Get attribute by ID with all its values
 */
export const getAttributeById = async (id) => {
  const attribute = await prisma.attribute.findUnique({
    where: { id },
    include: {
      values: {
        orderBy: {
          value: "asc",
        },
      },
      variantAttributes: {
        select: {
          variantId: true,
        },
      },
    },
  });

  if (!attribute) {
    throw new ApiError("Attribute not found", 404);
  }

  // Count unique variants using this attribute
  const uniqueVariants = new Set(
    attribute.variantAttributes.map((va) => va.variantId)
  );

  return {
    ...attribute,
    valueCount: attribute.values.length,
    usageCount: uniqueVariants.size,
    variantAttributes: undefined, // Remove raw data
  };
};

/**
 * Get all attributes with their values in a simple format
 */
export const getAttributesWithValues = async () => {
  const attributes = await prisma.attribute.findMany({
    include: {
      values: {
        orderBy: {
          value: "asc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return attributes.map((attr) => ({
    id: attr.id,
    name: attr.name,
    values: attr.values.map((v) => ({
      id: v.id,
      value: v.value,
    })),
  }));
};

/**
 * Delete attribute (only if not in use)
 */
export const deleteAttribute = async (id) => {
  const attribute = await prisma.attribute.findUnique({
    where: { id },
    include: {
      variantAttributes: true,
    },
  });
  console.log(attribute);

  if (!attribute) {
    throw new ApiError("Attribute not found", 404);
  }

  // Check if attribute is being used by any variants
  if (attribute.variantAttributes.length > 0) {
    throw new ApiError(
      `Cannot delete attribute. It is being used by ${attribute.variantAttributes.length} variant(s)`,
      400
    );
  }

  // Delete attribute (will cascade delete all values)
  return prisma.attribute.delete({ where: { id } });
};

/**
 * Update attribute with its values in one transaction
 * Supports three operations:
 * 1. Update attribute name
 * 2. Add new values
 * 3. Remove values (only if not in use)
 */
export const updateAttributeWithValues = async (id, data) => {
  const attribute = await prisma.attribute.findUnique({
    where: { id },
    include: {
      values: true,
      variantAttributes: {
        select: {
          attributeValueId: true,
        },
      },
    },
  });

  if (!attribute) {
    throw new ApiError("Attribute not found", 404);
  }

  // Get list of value IDs that are in use
  const valuesInUse = new Set(
    attribute.variantAttributes.map((va) => va.attributeValueId)
  );

  return prisma.$transaction(async (tx) => {
    let updatedAttribute = attribute;

    // 1. Update attribute name if provided
    if (data.name) {
      const normalizedName = data.name.toLowerCase().trim();

      // Check if new name already exists (excluding current attribute)
      const existingAttribute = await tx.attribute.findUnique({
        where: { name: normalizedName },
      });

      if (existingAttribute && existingAttribute.id !== id) {
        throw new ApiError(`Attribute "${normalizedName}" already exists`, 409);
      }

      updatedAttribute = await tx.attribute.update({
        where: { id },
        data: { name: normalizedName },
      });
    }

    // 2. Add new values if provided
    if (data.addValues && data.addValues.length > 0) {
      // Normalize values
      const normalizedValues = data.addValues.map((v) => v.trim());

      // Check for duplicates within the batch
      const uniqueValues = new Set(normalizedValues);
      if (uniqueValues.size !== normalizedValues.length) {
        throw new ApiError("Duplicate values in addValues array", 400);
      }

      // Check for empty values
      if (normalizedValues.some((v) => v.length === 0)) {
        throw new ApiError("Empty values are not allowed", 400);
      }

      // Check if any values already exist
      const existingValueNames = attribute.values.map((v) => v.value);
      const duplicateValues = normalizedValues.filter((v) =>
        existingValueNames.includes(v)
      );

      if (duplicateValues.length > 0) {
        throw new ApiError(
          `The following values already exist: ${duplicateValues.join(", ")}`,
          409
        );
      }

      // Create new values
      await tx.attributeValue.createMany({
        data: normalizedValues.map((value) => ({
          attributeId: id,
          value,
        })),
      });
    }

    // 3. Remove values if provided
    if (data.removeValueIds && data.removeValueIds.length > 0) {
      // Check if any of the values to remove are in use
      const inUseIds = data.removeValueIds.filter((valueId) =>
        valuesInUse.has(valueId)
      );

      if (inUseIds.length > 0) {
        throw new ApiError(
          `Cannot remove values with IDs [${inUseIds.join(
            ", "
          )}] - they are in use by variants`,
          400
        );
      }

      // Verify all values belong to this attribute
      const valuesToRemove = await tx.attributeValue.findMany({
        where: {
          id: { in: data.removeValueIds },
          attributeId: id,
        },
      });

      if (valuesToRemove.length !== data.removeValueIds.length) {
        throw new ApiError(
          "Some value IDs do not belong to this attribute",
          400
        );
      }

      // Delete values
      await tx.attributeValue.deleteMany({
        where: {
          id: { in: data.removeValueIds },
        },
      });
    }

    // Fetch and return complete attribute with all values
    return tx.attribute.findUnique({
      where: { id },
      include: {
        values: {
          orderBy: {
            value: "asc",
          },
        },
      },
    });
  });
};
