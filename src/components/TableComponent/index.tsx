import {
  Box,
  Button,
  CircularProgress,
  Flex,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorMode,
} from "@chakra-ui/react";
import styled from "@emotion/styled";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from "react-icons/ti";
import Pagination from "react-js-pagination";
import {
  useFilters,
  usePagination,
  useRowSelect,
  useRowState,
  useSortBy,
  useTable,
} from "react-table";
import ScrollbarWrapper from "../ScrollbarWrapper";
import CheckboxForTable from "./CheckboxForTable";
import { CSVLink } from "react-csv";

function export2csv() {
  let data = "";
  const tableData = [];
  const rows = document.querySelectorAll("table tr");
  for (const row of rows as any) {
    const rowData = [];
    for (const [index, column] of row.querySelectorAll("th, td").entries()) {
      // To retain the commas in the "Description" column, we can enclose those fields in quotation marks.
      if ((index + 1) % 3 === 0) {
        rowData.push('"' + column.innerText + '"');
      } else {
        rowData.push(column.innerText);
      }
    }
    tableData.push(rowData.join(","));
  }
  data += tableData.join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(["\ufeff", data], { type: "text/csv" })
  );
  a.setAttribute("download", "data.csv");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

type TableComponentProps = {
  columns: any;
  data: any;
  dontRecomputeChange?: boolean;

  /** Disables the table and shows a loading indicator  */
  loading?: boolean;

  /** Function invoked after clicking on a row (has an access to row.original)  */
  onRowClick?: (row: any) => void;
  contextMenu?: React.ReactNode;
  tableHeader?: React.ReactNode;
} & (
  | {
      selectableRows?: false | undefined;
      setIsAnythingSelected?: undefined;
      setSelectedStudents?: undefined;
    }
  | {
      /** Adds a column with checkboxes if true.  */
      selectableRows: true;

      /** Function invoked after rows selection change. Returns a boolean value. Needs selectableRows enabled.  */
      setIsAnythingSelected?: (isAnythingSelected: boolean) => void;

      /** Function invoked after rows selection change. Returns a boolean value. Needs selectableRows enabled.  */
      setSelectedStudents?: (rows: any[]) => void;
    }
);

const TableComponent: React.FC<TableComponentProps> = ({
  columns: columnsProp,
  data,
  dontRecomputeChange,
  onRowClick,
  selectableRows,
  setIsAnythingSelected,
  setSelectedStudents,
  loading,
  contextMenu,
  tableHeader,
}) => {
  const [csvData, setCsvData] = useState<any>();
  const { colorMode } = useColorMode();
  const { i18n } = useTranslation();
  const columns = useMemo(
    () => columnsProp,
    [dontRecomputeChange ? null : columnsProp, i18n.language]
  );

  // const data = useMemo(() => dataProp, [
  //   dontRecomputeChange ? null : dataProp,
  //   i18n.language,
  // ]);

  const tableInstance = useTable(
    {
      columns,
      data,
    },
    useFilters,
    useSortBy,
    usePagination,
    useRowState,
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((columns) => {
        return selectableRows
          ? [
              {
                id: "selection",
                Header: ({ getToggleAllRowsSelectedProps }) => (
                  <CheckboxForTable {...getToggleAllRowsSelectedProps()} />
                ),
                disableSortBy: true,
                Cell: ({ row }) => (
                  <CheckboxForTable {...row.getToggleRowSelectedProps()} />
                ),
              },
              ...columns,
            ]
          : [...columns];
      });
    }
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    selectedFlatRows,
    page,
    state,
    gotoPage,
    flatRows,
  } = tableInstance;

  const { pageSize, pageIndex } = state;

  const prepareForCsv = () => {
    const keys = tableInstance.allColumns.map((column) => column.Header);

    const prepared = tableInstance.rows.map((row) => {
      let row1 = { ...row };

      prepareRow(row1);
      return row1.cells.map((cell) => {
        if (cell.column.Cell) {
          try {
            const renderedCell = (cell.column.Cell as Function)(cell);

            if (renderedCell === null) {
              return "";
            }

            if (typeof renderedCell === "object") {
              return "N/A";
            }

            return renderedCell;
          } catch (err) {
            return "N/A";
          }
        }
      });
    });

    prepared.unshift(
      keys.map((key) => {
        if (key?.toString().indexOf("getToggleAll") !== -1) {
          return "Checkbox";
        }

        if (typeof key === "object" || typeof key === "function") {
          return "N/A";
        }

        return key;
      })
    );

    return prepared;
  };

  useEffect(() => {
    setSelectedStudents &&
      setSelectedStudents(selectedFlatRows.map((row) => row.original));

    if (setIsAnythingSelected) {
      if (selectedFlatRows.length > 0) {
        setIsAnythingSelected(true);
      } else {
        setIsAnythingSelected(false);
      }
    }
  }, [selectedFlatRows.length]);

  return (
    <ScrollbarWrapper>
      <Box overflowX="auto" position="relative">
        {contextMenu && (
          <Flex
            float={tableHeader ? "left" : "right"}
            width={tableHeader ? "100%" : "auto"}
            justifyContent={"space-between"}
            alignItems="center"
          >
            {tableHeader && <Box>{tableHeader}</Box>}

            <Flex flexDirection={"row"}>
              {contextMenu}
              <CSVLink data={prepareForCsv()}>
                <Button size="sm" float="right" marginLeft={2}>
                  CSV
                </Button>
              </CSVLink>
            </Flex>
          </Flex>
        )}

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ zIndex: 9999 }}
            >
              <CircularProgress
                size="35px"
                isIndeterminate
                color="blue.300"
                position="absolute"
                left="50%"
                top="50%"
                transform="translate3d(-50%, -50%, 0)"
                zIndex="9999"
              />
            </motion.div>
          )}
        </AnimatePresence>
        <Table
          {...getTableProps()}
          maxWidth="100%"
          transition="opacity 0.5s"
          pointerEvents={loading ? "none" : "all"}
          opacity={loading ? 0.3 : 1}
        >
          <Thead userSelect="none">
            {headerGroups.map((headerGroup) => (
              <Tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column, i) => (
                  <Th {...column.getHeaderProps(column.getSortByToggleProps())}>
                    <Flex justifyContent="space-between">
                      <Box color={column.isSorted ? "deepskyblue" : "default"}>
                        {column.render("Header")}
                      </Box>

                      <Box float="right" textAlign="right">
                        {column.isSorted ? (
                          <Box color="deepskyblue">
                            <AnimatedSortIcon
                              icon={<TiArrowSortedDown fontSize={16} />}
                              isVisible={column.isSortedDesc ? true : false}
                            />
                            <AnimatedSortIcon
                              icon={<TiArrowSortedUp fontSize={16} />}
                              isVisible={!column.isSortedDesc ? true : false}
                            />
                          </Box>
                        ) : (
                          !column.disableSortBy && (
                            <TiArrowUnsorted fontSize={16} />
                          )
                        )}

                        {/* {column.canFilter ? column.render("Filter") : null} */}
                      </Box>
                    </Flex>
                  </Th>
                ))}
              </Tr>
            ))}

            {headerGroups.map((headerGroup) => (
              <Tr {...headerGroup.getHeaderGroupProps()} padding={0}>
                {headerGroup.headers.map((column, i) =>
                  column.canFilter ? (
                    <Th {...column.getHeaderProps()} padding={2}>
                      {column.render("Filter")}
                    </Th>
                  ) : (
                    <Th key={i}>- </Th>
                  )
                )}
              </Tr>
            ))}
          </Thead>
          <Tbody {...getTableBodyProps()}>
            {page.map((row) => {
              prepareRow(row);
              return (
                <Tr
                  {...row.getRowProps()}
                  style={{
                    cursor: onRowClick ? "pointer" : "inherit",
                  }}
                  transition="all 0.5s"
                  _hover={
                    onRowClick
                      ? { bg: colorMode == "dark" ? "gray.700" : "gray.100" }
                      : {}
                  }
                >
                  {row.cells.map((cell) => (
                    <Td
                      {...cell.getCellProps()}
                      onClick={() =>
                        cell.column.id != "selection" &&
                        cell.column.id.substring(0, 6) != "button" &&
                        onRowClick
                          ? onRowClick(row.original)
                          : null
                      }
                    >
                      {cell.render("Cell")}
                    </Td>
                  ))}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
      {/* {JSON.stringify({
        selectedFlatRows: selectedFlatRows.map((row) => row.original),
      })} */}
      <PaginationStyled>
        <Pagination
          activePage={pageIndex + 1}
          itemsCountPerPage={pageSize}
          totalItemsCount={data.length}
          pageRangeDisplayed={5}
          onChange={(pageNumber: number) => {
            gotoPage(pageNumber - 1);
          }}
        />
      </PaginationStyled>
    </ScrollbarWrapper>
  );
};

const PaginationStyled = styled.div`
  .pagination {
    height: 30px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    li {
      list-style: none;
    }

    .disabled {
      opacity: 0.2;
      pointer-events: none;
    }

    .active {
      color: deepskyblue;
    }
  }

  width: 200px;

  margin: auto;
`;

const AnimatedSortIcon = ({
  icon,
  isVisible,
}: {
  icon: React.ReactNode;
  isVisible: boolean;
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, maxHeight: 0, maxWidth: 0 }}
          animate={{ opacity: 1, maxHeight: 5, maxWidth: 20 }}
          exit={{ opacity: 0, maxHeight: 0, maxWidth: 0 }}
        >
          {icon}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TableComponent;
