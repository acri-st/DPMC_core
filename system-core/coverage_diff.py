"""
coverage_diff is a little script that parse the results of the coverage_compute script and display the products which are covered less than PERCENTAGE%
"""
import argparse
import sys


#########################################################################################
#                                                                                       #
#                                  FUNCTION DECLARATION                                 #
#                                                                                       #
#########################################################################################


def parse_arguments():
    """
    Parsing function using argparse library
    :return: args dictionary with all arguments
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("-f",
                        action="store",
                        dest="file_path",
                        help="input file_path from coverage_compute.py",
                        type=str
                        )
    parser.add_argument("-z",
                        action="store",
                        dest="zzz_output_file_path",
                        help="output zzz_file_path",
                        type=str
                        )
    parser.add_argument("-o",
                        action="store",
                        dest="zzz_input_file_path",
                        help="input zzz_file_path",
                        type=str
                        )
    parser.add_argument("-p",
                        action="store",
                        dest="percentage",
                        help="change the percentage of the coverage. Default 99.9.",
                        type=float,
                        default=99.9
                        )
    return parser.parse_args()


def parse_check_ope_list(file_path, zzz_output_file_path):
    """
    Parse the output list from the coverage_compute.py
    :param zzz_output_file_path: output file containing name;percent
    :param file_path: Path of the output file of the coverage_compute.py
    """

    if file_path is None:
        print("Error -z needs -f. Aborted")
        sys.exit(1)

    # Reading input file
    with open(file_path) as file:
        content = file.readlines()

    # Writing output in a zzz file
    output_zzz = None
    if zzz_output_file_path is not None:
        output_zzz = open(zzz_output_file_path, 'w')

    # Parsing the products and saving them in a dictionary to handle duplicate products
    products = dict()

    for line in content:
        # selecting name and percentage after cleaning the string line
        name = line.split(",")[0].replace("(", "").replace("'", "").replace(" ", "")
        percent = line.split(",")[-1].replace(")", "").replace("%", "").replace("'", "").replace("\n", "").replace(" ","")
        if output_zzz is not None:
            output_zzz.write("{};{}\n".format(name, percent))

        # merge duplicates products by summing percentages
        products[name] = products.get(name, 0) + float(percent)

    if output_zzz is not None:
        output_zzz.close()

    return products


def get_diff(products, zzz_input_file_path, percentage):
    """
    Manipulate the dictionary of products
    :param percentage: the percentage to use to compare the coverage
    :param products: dictionary with keys the name of a product and value the summed percentage
    :param zzz_input_file_path: input zzz file which contains name;percent
    :return: print the name and the result
    """

    # Read zzz file and fill product dict
    if zzz_input_file_path is not None:
        with open(zzz_input_file_path) as file:
            zzz_input = file.readlines()
        products = dict()
        for line in zzz_input:
            try:
                name = line.split(";")[0]
                percent = line.split(";")[1].replace("\n", "")
                products[name] = products.get(name, 0) + float(percent)
            except Exception as err:
                print("An error occurred when parsing {}.\n{}".format(zzz_input_file_path, err))
                sys.exit(1)
    for name in sorted(products):
        try:
            if float(products[name]) < float(percentage):
                try:
                    value = (100 - float(products[name])) * int(name[64:68]) / 100
                    if value > 1.1:
                        print("{} {}".format(name, int(value)))
                except ValueError as err:
                    print("Error when parsing name: {}".format(err))
        except ValueError as err:
            print("Error when parsing percent: {}".format(err))


#########################################################################################
#                                                                                       #
#                                  PROGRAM DECLARATION                                  #
#                                                                                       #
#########################################################################################


if __name__ == '__main__':
    args = parse_arguments()

    if args.file_path is None and args.zzz_output_file_path is None and args.zzz_input_file_path is None:
        print("Need at least one parameter. -f | -z | -o")
        sys.exit(1)

    products_results = None

    if args.zzz_input_file_path is None:
        products_results = parse_check_ope_list(args.file_path, args.zzz_output_file_path)
        if args.zzz_output_file_path is not None:
            sys.exit(0)

    # if zzz output file path is None so we can exec the get_diff function
    get_diff(products_results, args.zzz_input_file_path, args.percentage)
